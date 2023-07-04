const axios = require("axios");

const geoCoderResponse = async (address) => {
  try {
    const response = await axios({
      method: "get",
      url: "https://maps.googleapis.com/maps/api/geocode/json",
      params: {
        address: address,
        //   `${cStreetName} ${cStreetNum}, ${cZip} ${cCity},${cProvince}, ${cCountry}`
        key: process.env.GOOGLE_KEY,
      },
    });
    if (response.data.status === "OK") {
      return response.data.results[0].geometry.location;
    }
    return response.data;
  } catch (e) {
    return e;
  }
};

module.exports = geoCoderResponse;
