const common = {
    promisify: function(fn, receiver) {
        return function() {
            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }
            return new Promise(function(resolve, reject) {
                fn.apply(receiver, [].concat(args, [function(err, res) {
                    return err ? reject(err) : resolve(res);
                }]));
            });
        };
    },
    checkData: function(data) {
        if (data === '' || data == null || data == undefined) {
            return false;
        }
        for (var i in data) {
            if (data[i] === '') {
                return false;
            }
        }
        return true;
    }
};
module.exports = common;