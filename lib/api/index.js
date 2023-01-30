const axios = require('../request');

const getRepoList = params => {
    return axios.request({
        url: 'https://api.github.com/orgs/xq-cli/repos',
        params,
        method: 'get'
    })
}

module.exports = {
    getRepoList
}