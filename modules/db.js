var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost');
var db = mongoose.connection;

module.exports = db;
//  mongod --dbpath D:/mongodb/blog
db.on('error',console.error.bind(console,'mongodb连接错误:'));
db.once('open',function(){
    console.log('mongodb connection is OK!');
});