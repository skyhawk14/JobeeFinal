const nodeGeoCoder = require('node-geocoder');
const options = {
    provider: 'mapquest',
    apiKey: '91vGaihvsmoj4TGinQ3nmfbOzs1e71F5',
    formatter: null
}

const geoCoder = nodeGeoCoder(options);
module.exports = geoCoder;