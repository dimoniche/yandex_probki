
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var net  = require('net');
var mpns = require('mpns');

var app = express();

// all environments
app.set('port', 5002);
app.set('port_phone7', 5003);

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

var TextBoxCount = 0;

var TextBoxUri                 = 'http://db3.notify.live.net/throttledthirdparty/01.00/AAEQvMgo35PfT7ExYnvZMBrSAgAAAAADNAAAAAQUZm52OkJCMjg1QTg1QkZDMkUxREQ';
var TextBoxBackgroundImage     = 'http://info.maps.yandex.net/traffic/spb/current_traffic_100.gif';
var TextBoxBackBackgroundImage = 'http://info.maps.yandex.net/traffic/spb/tends_200.png';
var TextBoxTitle       = ' ';
var TextBoxBackTitle   = ' ';
var TextBoxBackContent = ' ';

var options = {

    backgroundImage: TextBoxBackgroundImage,
    count: TextBoxCount,
    title: TextBoxTitle,
    backBackgroundImage: TextBoxBackBackgroundImage,
    backTitle: TextBoxBackTitle,
    backContent: TextBoxBackContent
};

// количество пользователей
var count_user;
var URI;

// обновление плитки
function update_tile()
{
    mpns.sendTile(TextBoxUri,options);

    console.log('обновляем тайл');
}

// запустим обновление тайлов
var intervalID = setInterval(function()
    {   // это вызывается переодически
        update_tile();
    }
    ,300000);

http.createServer(function (req, res) {

    var live = req.headers['push'];
    console.log(live);

}).listen(app.get('port_phone7'),function(){

        console.log('Ожидаем телефоны на порте ' + app.get('port_phone7'));

    });

/*http.createServer(app).listen(app.get('port'), function(stream)
{
    console.log('Windows tile listening on port ' + app.get('port'));
});*/

var databaseUrl = 'mydb_tile_update'; // "username:password@example.com/mydb"
var collections = ["users"];

var mongojs = require('mongojs');
var db = mongojs(databaseUrl,collections);
//var mycollection = db.collection('mycollection');

// Открываем коллекцию. Если её не существует, она будет создана
 /*db.collection('tile_user', function(err, collection)
 {
     // Добавляем три элемента
     for(var i = 0; i < 3; i++)
     {    collection.insert({'users':i});
     }
 });*/

db.users.find({name: "iLoveMongo"}, function(err, users) {
    if( err || !users)
    { // no user
        console.log("No female users found");
    }
    else users.forEach( function(femaleUser) {
        console.log(femaleUser);
    } );
});

/*db.users.save({URIs: "srirangan@gmail.com", name: "iLoveMongo"}, function(err, saved) {
    if( err || !saved ) console.log("User not saved");
    else console.log("User saved");
});*/

