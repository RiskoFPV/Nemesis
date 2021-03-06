const request = require("request").defaults({ encoding: null });

module.exports = new class {
  get(cb) {
    request(
      {
        url: "https://api.github.com/repos/heliorc/imuf-release-dev/contents",
        headers: {
          "User-Agent": "request"
        }
      },
      (error, response, body) => {
        try {
          let data = JSON.parse(body);
          cb(
            data.filter(file => file.name.endsWith(".bin")).map(file => {
              file.note =
                "See the release notes here: https://github.com/heliorc/imuf-release/blob/master/CHANGELOG.md";
              return file;
            })
          );
        } catch (ex) {
          cb([]);
        }
      }
    );
  }
  load(binUrl, callback) {
    request(
      {
        url: binUrl,
        headers: {
          "User-Agent": "request"
        }
      },
      (error, response, body) => {
        if (response.statusCode >= 400) {
          callback({ error: body });
        } else {
          callback(body);
        }
      }
    );
  }
}();
