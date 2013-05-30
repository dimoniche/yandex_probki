
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

// База данных
var databaseUrl = 'dimoniche.cloudapp.net/tile_update';
var collections = ["users"];

var mongojs = require('mongojs');
var db = mongojs(databaseUrl,collections);
var mycollection = db.collection('users');

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
function update_tile(URI)
{
    mpns.sendTile(URI,options);

    console.log('обновляем тайл');
}

// запустим обновление тайлов
var intervalID = setInterval(function()
    {   // это вызывается переодически
        db.users.find(function(err, cursor) {
            db.users.each(function(err,item){

                if(item != null)
                {
                    update_tile(item.URIs);

                    console.log(item);
                }
                else
                {
                    console.log('все обновили');
                }
            });
        });
    }
    ,300000);

// ожидание новых пользователей
http.createServer(function (req, res) {

    var live = req.headers['push'];

    console.log(live);

    db.users.find({URIs: live}, function(err, users) {
        if( err || !users.length)
        { // no user
            console.log("Такого пользователя нет - добавляем");

            db.users.save({name: "name", URIs: live}, function(err, saved) {
             if( err || !saved ){
                 console.log("User not saved");

                 // нужно что  то сделать
             }
             else console.log("User saved");

             });

        }
        else users.forEach( function(User) {
            console.log("Такой поьзователь уже есть");
            console.log(User);
        } );
    });

}).listen(app.get('port_phone7'),function(){

        console.log('Ожидаем телефоны на порте ' + app.get('port_phone7'));

    });

