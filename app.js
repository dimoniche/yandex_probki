
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
var databaseUrl = 'dimoniche.cloudapp.net/tile_update_test';

var collections      = ["users"];
var town_collections = ["town"];
var stat_collections = ["stat"];

var mongojs = require('mongojs');
var db = mongojs(databaseUrl,collections);
var db_town = mongojs(databaseUrl,town_collections);
var db_stat = mongojs(databaseUrl,stat_collections);

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

var Green  = "http://dimoniche.cloudapp.net/svetofor_green.png";
var Yellow = "http://dimoniche.cloudapp.net/svetofor_yellow.png";
var Red    = "http://dimoniche.cloudapp.net/svetofor_red.png";

// количество пользователей
var count_user;

// обновление плитки
function update_tile(URI)
{
    var options = {

        backgroundImage: TextBoxBackgroundImage,
        count: TextBoxCount,
        title: TextBoxTitle,
        backBackgroundImage: TextBoxBackBackgroundImage,
        backTitle: TextBoxBackTitle,
        backContent: TextBoxBackContent
    };

    mpns.sendTile(URI,options);

    console.log('обновляем тайл');
}

// запустим обновление тайлов
var intervalID = setInterval(function()
    {   // это вызывается периодически

        // спросим у яндекса как там с пробками дела
        var jsonobj;        // объект со всеми пробками из яндекса

        http.get("http://api-maps.yandex.ru/services/traffic-info/1.0/?format=json",
            function(res) {
                console.log("Got response: " + res.statusCode);

                var data = '';

                res.on('data', function (chunk) {
                    //console.log('JSON: ' + chunk);
                    data += chunk;
                });

                res.on('end', function () {

                    jsonobj = JSON.parse(data);

                    //  смотрим по базе всех пользователей
                    db.users.find(function(err, users) {
                        for(var i = 0; i < users.length; i++)
                        {
                            var number_town = 0;

                            db_town.town.find({name: jsonobj.GeoObjectCollection.features[i].properties.name.toString()}, function(err, town) {
                                if( err || !town.length)
                                {   // no town

                                }
                                else town.forEach( function(Town) {
                                    // пользователь есть - обновим координаты и город
                                    if(Town.number !== undefined){number_town = Town.number;}
                                    else                         {number_town = 0;}
                                });
                            });

                            var level = jsonobj.GeoObjectCollection.features[number_town].properties.JamsMetaData.level;
                            var icon  = jsonobj.GeoObjectCollection.features[number_town].properties.JamsMetaData.icon;
                            var name  = jsonobj.GeoObjectCollection.features[number_town].properties.name;

                            if(level != undefined) {;}
                            else                  {level = 1;}

                            if(icon != undefined) {;}
                            else                  {icon = 'green';}

                            TextBoxTitle       = level.toString();
                            TextBoxBackTitle   = ' ';
                            TextBoxBackContent = ' ';

                            switch(icon)
                            {
                                case "green":
                                    TextBoxBackgroundImage = Green;
                                break;
                                case "yellow":
                                    TextBoxBackgroundImage = Yellow;
                                    break;
                                case "red":
                                    TextBoxBackgroundImage = Red;
                                    break;
                            }

                            switch(name)
                            {
                                case "Санкт-Петербург":
                                    TextBoxBackBackgroundImage = 'http://info.maps.yandex.net/traffic/spb/tends_200.png';
                                    break;
                                case "Москва":
                                    TextBoxBackBackgroundImage = 'http://info.maps.yandex.net/traffic/moscow/tends_200.png';
                                    break;
                                case "Екатеринбург":
                                    TextBoxBackBackgroundImage = 'http://info.maps.yandex.net/traffic/ekb/tends_200.png';
                                    break;
                                case "Киев":
                                    TextBoxBackBackgroundImage = 'http://info.maps.yandex.net/traffic/kiev/tends_200.png';
                                    break;
                                default :
                                    TextBoxBackBackgroundImage = '';
                                    break;
                            }

                            update_tile(users[i].URIs);

                            //console.log(users[i]);
                            //console.log(level);
                            //console.log(TextBoxBackBackgroundImage);
                        }

                        console.log('все обновили');
                    });
                });
            }).on('error', function(e) {
                console.log("Got error: " + e.message);
            });
    }
    ,30000);

// ожидание новых пользователей
http.createServer(function (req, res) {

    var live      = req.headers['push'];
    var latitude  = req.headers['latitude'];
    var longitude = req.headers['longitude'];

    console.log(live);

    var town;

    http.get("http://geocode-maps.yandex.ru/1.x/?geocode="+longitude+","+latitude+"&format=json&kind=locality&results=1",
        function(res) {
        // получим название города поьзователя
        var data = '';

        res.on('data', function (chunk) {
            //console.log('JSON: ' + chunk);
            data += chunk;
        });

        res.on('end', function () {
            // название города нашли - вносим в базу
            var jsonobj = JSON.parse(data);

            console.log("http://geocode-maps.yandex.ru/1.x/?geocode="+longitude+","+latitude+"&format=json&kind=locality&results=1");

            if(jsonobj.response.GeoObjectCollection.featureMember[0].GeoObject != undefined)
            {
                town = jsonobj.response.GeoObjectCollection.featureMember[0].GeoObject.name;

                db.users.find({URIs: live}, function(err, users) {
                    if( err || !users.length)
                    { // no user
                        console.log("Такого пользователя нет - добавляем");
                        console.log('Город: ' + town.toString());

                        db.users.save({name: "name",
                            URIs: live,
                            Latitude: latitude,
                            Longitude: longitude,
                            Town: town
                        }, function(err, saved) {
                            if( err || !saved ){
                                console.log("User not saved");
                                // нужно что  то сделать
                            }
                            else console.log("User saved");

                            count_user++;
                        });
                    }
                    else users.forEach( function(User) {
                        // пользователь есть - обновим координаты и город
                        console.log("Такой пользователь уже есть");
                        console.log(User);

                        db.users.update({URIs: live},{$set: {Latitude: latitude, Longitude: longitude,Town: town}}, function(err, updated) {
                            if( err || !updated ) console.log("User not updated");
                            else console.log("User updated");
                        });
                    });
                });
            }
        });
    }).on('error', function(e) {
            console.log("Got error: " + e.message);
    });

}).listen(app.get('port_phone7'),function(){

        console.log('Ожидаем телефоны на порте ' + app.get('port_phone7'));

    });

//отправим запрос яндексу - составим базу городов
http.get("http://api-maps.yandex.ru/services/traffic-info/1.0/?format=json",
    function(res) {
    console.log("Got response: " + res.statusCode);

    var data = '';

    res.on('data', function (chunk) {
        //console.log('JSON: ' + chunk);
        data += chunk;
    });

    res.on('end', function () {

        var jsonobj = JSON.parse(data);

        for( var i = 0,length = jsonobj.GeoObjectCollection.features.length; i < length; i++ )
        {
            db_town.town.find({name: jsonobj.GeoObjectCollection.features[i].properties.name.toString()}, function(err, town) {
                if( err || !town.length)
                { // no user
                    console.log("Такого города нет - добавляем");
                    console.log('Город: ' + town.name);

                    db_town.town.save({name: jsonobj.GeoObjectCollection.features[i].properties.name.toString(), number: i}, function(err, saved) {
                        if( err || !saved ){
                            console.log("Town not saved");
                            // нужно что  то сделать
                        }
                        else console.log("Town saved");
                    });
                }
                else town.forEach( function(Town) {
                    // пользователь есть - обновим координаты и город
                    console.log("Такой город уже есть");
                    console.log(Town.name);
                });
            });

            console.log('Город: ' + jsonobj.GeoObjectCollection.features[i].properties.name);
        }
    });

}).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
