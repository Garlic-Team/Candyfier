const Axios = require("axios");

module.exports = async (png, gif) => {
    /*let resp;
    try {
        resp = await Axios({
            url: gif,
            method: "GET"
        });
    } catch {
        return png;
    }

    if (resp.status === 200) return gif;
    else return png;*/
    // Ignoring old method, just using PNG version
    return png;
}