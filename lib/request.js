// api/request.js
const axios = require('axios');

class HttpRequest {
    constructor(baseUrl, options = {}) {
        this.baseUrl = baseUrl;
        this.commonOptions = options;
    }
    getInsideConfig() {
        const configs = {
            baseUrl: this.baseUrl,
            ...this.commonOptions
        };
        return configs;
    }
    request(options) {
        const instance = axios.create({});
        options = Object.assign(this.getInsideConfig(), options);
        return instance(options);
    }
};

module.exports = new HttpRequest('');