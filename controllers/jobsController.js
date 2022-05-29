const jobs = require("../models/jobs");
const Job = require("../models/jobs");
const geoCoder = require("../utils/geocoder");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const APIFilters = require("../utils/apiFilters");
const path = require("path");
const fs = require("fs");
// Get all jobs /api/v1/jobs
exports.getJobs = catchAsyncErrors(async (req, res, next) => {
  console.log(req.query);
  const apiFilters = new APIFilters(Job.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .searchByQuery()
    .pagination();
  // const jobs = await Job.find();
  const jobs = await apiFilters.query;
  res.status(200).json({
    success: true,
    results: jobs.length,
    data: jobs,
  });
});

// get a single job with id or slug => /api/v1/job/:id/:slug
exports.getJob = catchAsyncErrors(async (req, res, next) => {
  const job = await Job.find({
    $and: [{ _id: req.params.id }, { slug: req.params.slug }],
  }).populate({
    path: "user",
    select: "name",
  });
  if (!job || job.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Job not found",
    });
  }
  res.status(200).json({
    success: true,
    message: "Job Found",
    data: job,
  });
});

// create a new job /api/v1/job/new
exports.newJob = catchAsyncErrors(async (req, res, next) => {
  // console.log(req.body)
  // adding user to body
  req.body.user = req.user.id;
  const job = await Job.create(req.body);
  res.status(200).json({
    success: true,
    message: "Job Created",
    data: job,
  });
});

//search jobs within radius /api/v1/jobs/:zipcode/:distance
exports.getJobsInRadius = catchAsyncErrors(async (req, res, next) => {
  const { zipcode, distance } = req.params;
  console.log(req.params);
  //getting latitude and longitude with zipcode
  const loc = await geoCoder.geocode(zipcode);
  console.log(loc);
  const latitude = loc[0].latitude;
  const longitude = loc[0].longitude;

  const radius = distance / 3963;

  //geoWithin and centerSphere inbuilt mongo
  const jobs = await Job.find({
    location: {
      $geoWithin: {
        $centerSphere: [[longitude, latitude], radius],
      },
    },
  });
  res.status(200).json({
    success: true,
    message: "Job Updated",
    data: job,
  });
});

// update a job => /api/v1/job/:id
exports.updateJob = catchAsyncErrors(async (req, res, next) => {
  console.log(req.params.id);
  let job = await Job.findById(req.params.id);
  if (!job) {
    return next(new ErrorHandler("Job not found", 404));
  }
  //check if the user is the owner
  if (job.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorHandler(`User${req.user.id} is not allowed to update the job`)
    );
  }
  // deleting files associated with job
  const delJob = await Job.findOne({ _id: req.params.id });

  // if job is deleted then delete the resumes also which was applied by user with
  for (let i = 0; i < delJob.applicantsApplied.length; i++) {
    let obj = delJob.applicantsApplied[i];
    let filePath = `${__dirname}/public/uploads/${obj.resume}`.replace(
      "\\controllers",
      ""
    );
    fs.unlink(filePath, (err) => {
      if (err) return console.log(err);
    });
  }
  console.log(job);
  job = await Job.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    success: true,
    message: "Job is updated",
    data: job,
  });
});

// delete a job => /api/v1/job/:id
exports.deleteJob = catchAsyncErrors(async (req, res, next) => {
  let job = await Job.findById(req.params.id).select("+");
  if (!job) {
    return next(new ErrorHandler("Job not found", 404));
  }

  //check if the user is owner
  if (job.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorHandler(
        `User (${req.user.id}) is not allowed to delete this job`
      )
    );
  }
  // deleting files associated with job
  // const delJob = await Job.findOne({ _id: req.params.id });

  // if job is deleted then delete the resumes also which was applied by user with
  for (let i = 0; i < job.applicantsApplied.length; i++) {
    let obj = job.applicantsApplied[i];
    let filePath = `${__dirname}/public/uploads/${obj.resume}`.replace(
      "\\controllers",
      ""
    );
    fs.unlink(filePath, (err) => {
      if (err) return console.log(err);
    });
  }
  job = await Job.findByIdAndDelete(req.params.id);
  res.status(200).json({
    success: true,
    message: "Job deleted",
    data: job,
  });
});

//Get stats about a topic(job) => /api/v1/stats/:topic
exports.jobStats = catchAsyncErrors(async (req, res, next) => {
  const stats = await Job.aggregate([
    {
      $match: { $text: { $search: '"' + req.params.topic + '"' } },
    },
    {
      $group: {
        _id: {
          $toUpper: "$experience",
        },
        totalJobs: { $sum: 1 },
        avgPosition: { $avg: "$position" },
        avgSalary: { $avg: "$salary" },
        minSalary: { $min: "$salary" },
        maxSalary: { $max: "$salary" },
      },
    },
  ]);
  if (stats.length === 0) {
    return next(new ErrorHandler("No stats found", 200));
  }
  res.status(200).json({
    status: true,
    data: stats,
  });
});

// apply to job using resume => /api/v1/job/:id/apply
exports.applyJob = catchAsyncErrors(async (req, res, next) => {
  let job = await Job.findById(req.params.id).select("+applicantsApplied");
  if (!job) {
    return next(new ErrorHandler(`Job not found`, 404));
  }

  // chekc if job last date has been passed or not
  if (job.lastDate < new Date(Date.now())) {
    return next(
      new ErrorHandler(`YOu can not apply to this job. Date is over`, 400)
    );
  }
  console.log(job.applicantsApplied.length);
  //check if user has applied before
  for (let i = 0; i < job.applicantsApplied.length; i++) {
    if (job.applicantsApplied[i].id === req.user.id) {
      return next(
        new ErrorHandler("You have already applied to this job", 400)
      );
    }
  }

  //check the files
  if (!req.files) {
    return next(new ErrorHandler("Please upload file", 400));
  }

  const file = req.files.file;

  // check file type
  const supportedFiles = /,docs|.pdf/;
  if (!supportedFiles.test(path.extname(file.name))) {
    return next(new ErrorHandler("Please upload document file", 400));
  }

  // check document size
  if (file.size > process.env.MAX_FILE_SIZE) {
    return next(new ErrorHandler("Please upload file less than 2MB", 400));
  }

  //renaming resule
  file.name = `${req.user.name.replace(" ", "_")}_${job._id}${
    path.parse(file.name).ext
  }`;
  file.mv(`${process.env.UPLOAD_PATH}/${file.name}`, async (err) => {
    if (err) {
      console.log(err);
      return next(new ErrorHandler("Resume Upload Failed.", 500));
    }
    await Job.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          applicantsApplied: {
            id: req.user.id,
            resume: file.name,
          },
        },
      },
      {
        new: true,
        runValidators: true,
        useFindAndModify: false,
      }
    );
    res.status(200).json({
      success: true,
      message: "Applied to job successfully",
      data: file.name,
    });
  });
});
