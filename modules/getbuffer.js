const Axios = require("axios");
const fileType = require("file-type");
const sizeof = require("buffer-image-size");

module.exports = async (url) => {
    let buff = (await Axios({
        url,
        method: "GET",
        responseType: "arraybuffer"
    })).data;

    let type;
    try {
        type = await fileType.fromBuffer(buff);
    } catch (e) {
        return false;
    }

    let size = await sizeof(buff);

    let still = ["png","jpg","jpeg"];
    let animated = ["gif","apng"];

    if (still.some((v) => type.mime.endsWith(v))) return [type, size, "still", buff];
    if (animated.some((v) => type.mime.endsWith(v))) return [type, size, "animated", buff];

    return false;
}