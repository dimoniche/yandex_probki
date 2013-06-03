﻿
/**
 * Module dependencies.
 */

//var express = require('express')
//var routes = require('./routes')
//var user = require('./routes/user')
var http = require('http')
var path = require('path');

var net  = require('net');
var mpns = require('mpns');

// all environments
var port = 5002;
var port_phone7 = 5003;

// База данных
var databaseUrl = 'dimoniche.cloudapp.net/tile_update';

var collections      = ["users"];
var town_collections = ["town"];
var stat_collections = ["stat"];

var mongojs = require('mongojs');
var db = mongojs(databaseUrl,collections);
var db_town = mongojs(databaseUrl,town_collections);
var db_stat = mongojs(databaseUrl,stat_collections);

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
function update_tile(URI,options)
{
    mpns.sendTile(URI,options);

    console.log('обновляем тайл');
}

// запустим обновление тайлов
var intervalID = setInterval(function()
    {   // это вызывается периодически

        // спросим у яндекса как там с пробками дела
        var jsonobj;        // объект со всеми пробками из яндекса
        var options = {

            backgroundImage: TextBoxBackgroundImage,
            count: TextBoxCount,
            title: TextBoxTitle,
            backBackgroundImage: TextBoxBackBackgroundImage,
            backTitle: TextBoxBackTitle,
            backContent: TextBoxBackContent
        };

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
                        if(users != undefined)
                        {
                            for(var i = 0; i < users.length; i++)
                            {
                                db_town.town.find({name: users[i].Town}, function(err, town) {

                                    if( err || !town.length)
                                    {   // no town
                                        console.log("Ошибка " + err);
                                        console.log(town.length);
                                    }
                                    else
                                    {   // пользователь есть - обновим координаты и город
                                        if(town[0].number != undefined){number_town = town[0].number;}
                                        else                           {number_town = 0;}

                                        console.log(number_town);
                                        console.log(town[0].name);

                                        var level = jsonobj.GeoObjectCollection.features[number_town].properties.JamsMetaData.level;
                                        var icon  = jsonobj.GeoObjectCollection.features[number_town].properties.JamsMetaData.icon;
                                        var name  = jsonobj.GeoObjectCollection.features[number_town].properties.name;

                                        if(level != undefined) {;}
                                        else                  {level = 1;}

                                        if(icon != undefined) {;}
                                        else                  {icon = 'green';}

                                        options.title       = level.toString();
                                        options.backTitle   = ' ';
                                        options.backContent = ' ';

                                        switch(icon)
                                        {
                                            case "green":
                                                options.backgroundImage = Green;
                                                break;
                                            case "yellow":
                                                options.backgroundImage = Yellow;
                                                break;
                                            case "red":
                                                options.backgroundImage = Red;
                                                break;
                                        }

                                        switch(name)
                                        {
                                            case "Санкт-Петербург":
                                                options.backBackgroundImage = 'http://info.maps.yandex.net/traffic/spb/tends_200.png';
                                                break;
                                            case "Москва":
                                                options.backBackgroundImage = 'http://info.maps.yandex.net/traffic/moscow/tends_200.png';
                                                break;
                                            case "Екатеринбург":
                                                options.backBackgroundImage = 'http://info.maps.yandex.net/traffic/ekb/tends_200.png';
                                                break;
                                            case "Киев":
                                                options.backBackgroundImage = 'http://info.maps.yandex.net/traffic/kiev/tends_200.png';
                                                break;
                                            default :
                                                options.backBackgroundImage = '';
                                                break;
                                        }

                                        update_tile(users[i].URIs,options);

                                        //console.log(users[i]);
                                        console.log(options.backgroundImage);
                                        console.log(options.backBackgroundImage);
                                    }
                                });
                            }
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

            if(jsonobj.response.GeoObjectCollection.metaDataProperty.GeocoderResponseMetaData.found != 0)
            {
                if(jsonobj.response.GeoObjectCollection.featureMember[0].GeoObject.metaDataProperty.GeocoderMetaData.AddressDetails.Country.Locality != undefined)
                {
                    town = jsonobj.response.GeoObjectCollection.featureMember[0].GeoObject.metaDataProperty.GeocoderMetaData.AddressDetails.Country.Locality.LocalityName;

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
            }
        });
    }).on('error', function(e) {
            console.log("Got error: " + e.message);
    });

}).listen(port_phone7,function(){

        console.log('Ожидаем телефоны на порте ' + port_phone7);

    });

//отправим запрос яндексу - составим базу городов
/*http.get("http://api-maps.yandex.ru/services/traffic-info/1.0/?format=json",
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
            db_town.town.save({name: jsonobj.GeoObjectCollection.features[i].properties.name.toString(), number: i}, function(err, saved) {
                if( err || !saved ){
                    console.log("Town not saved");
                    // нужно что  то сделать
                }
                else console.log("Town saved");
            });

            console.log('Город: ' + jsonobj.GeoObjectCollection.features[i].properties.name);
        }
    });

}).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
*/