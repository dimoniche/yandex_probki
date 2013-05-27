
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
app.set('port', 5000);
app.set('port_phone7', 5001);

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

http.createServer(app).listen(app.get('port'), function(stream)
{
    console.log('Windows tile listening on port ' + app.get('port'));
});

var server = net.createServer(function (stream) {
    console.log('server connected');

    stream.on('data', function (data) {

        console.log(data);

    });

    stream.on('close', function () {
        console.log('server connection close');
    });
    stream.on('end', function () {
        console.log('server disconnected');
    });
    stream.on('error', function () {
        console.log('server error');
    });
});

server.listen(app.get('port_phone7'), function() {
    console.log('ожидаем телефоны');
});
