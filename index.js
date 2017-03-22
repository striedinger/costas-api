var express = require('express');
const fs = require('fs');
var app = express();
var mongodb = require('mongodb');
var url = 'mongodb://localhost:27017/costas';

var MongoClient = mongodb.MongoClient;

app.use(express.static('public'));

app.get('/test', function(req, res){
    var dataFileName = "datos.txt";
    const uuidV1 = require('uuid/v1');
    var uuid = uuidV1();
    var gnuplot = require('gnuplot');
    gnuplot()
    .println("set term png")
    .println("unset output")
    .println("set pm3d interpolate 0,0")
    //.println("splot 'datos.txt'", {end: true})
    .println("plot 'public/data/"+dataFileName+"' using 2:1:3 with image notitle", {end: true})
    .pipe(img = fs.createWriteStream('public/images/'+ uuid +'.png'));
    img.on('finish', function(){
        res.sendFile('/public/images/'+ uuid +'.png', { "root": __dirname });
    });
})

app.get('/', function(req, res){
	var formats = ['csv', 'xyz', 'img'];
	var format = req.param('format');
	var coords = req.param('coords');
	var coordinates = new Array();
	coords.push(coords[0]);
	coords.forEach(function(c){
		var set = new Array();
		var pair = c.split(',');
		pair.forEach(function(p){
			set.push(6);
		});
		pair = pair.map(Number);
		coordinates.push(pair);
	});
	console.log(coordinates);
	if(formats.includes(format)){
		
	}
	var extension = null;
        var separator = null;
        switch(format){
            case 'csv':
                extension = 'csv';
                separator = ', ';
            break;
            case 'xyz':
                extension = 'xyz';
                separator = ' ';
            break;
            default:
                extension = 'txt';
                separator = ' ';

        }
        MongoClient.connect(url, function (err, db) {
            if (err) {
                console.log('Unable to connect to the mongoDB server. Error:', err);
            } else {
                console.log('Connection established to', url);
                console.log("Loading data....");
                var start = new Date().getTime();
                var collection = db.collection('batimetrias');
                collection.find({
                    'geometry': {
                        $geoWithin: {
                            $geometry: {
                                type : "Polygon" ,
                                coordinates: [ coordinates ]//[ [ -76.55273437500001, 15.262988555023204 ], [ -79.58496093750001, 15.262988555023204 ], [ -79.58496093750001, 13.432366575813761 ], [ -76.55273437500001, 13.432366575813761 ], [ -76.55273437500001, 15.262988555023204 ] ] ]
                            }
                        }
                    }
                }).toArray(function(err, doc){
                	if(err){
                		res.send(err);
                	}
                    var end = new Date().getTime(); 
                    var time = end - start;
                    console.log('Execution time: ' + time);
                    var data = "";
                    doc.forEach(function(d){
                        /*if(format=="img"){
                            if(d.properties.depth<0){
                                d.properties.depth = 0;
                            }
                        }*/
                        data = data + d.geometry.coordinates[0] + separator + d.geometry.coordinates[1] + separator + d.properties.depth + "\n";
                    });
                    var filename = "datos." + extension;
                    if(format=="img"){
                        const uuidV1 = require('uuid/v1');
                        var uuid = uuidV1();
                        var dataFileName = uuid + ".txt";
                        fs.writeFile("public/data/"+dataFileName, data, function(err){
                            if(err){
                                res.status(500).send("Error de servidor!");
                            }
                            var gnuplot = require('gnuplot');
                            gnuplot()
                                .println("set term png")
                                .println("unset output")
                                //.println("set pm3d interpolate 0,0")
                                //.println("splot 'datos.txt'", {end: true})
                                .println("plot 'public/data/"+dataFileName+"' using 2:1:3 with image notitle", {end: true})
                                .pipe(img = fs.createWriteStream('public/images/'+ uuid +'.png'));
                                img.on('finish', function(){
                                    res.sendFile('/public/images/'+ uuid +'.png', { "root": __dirname });
                                });
                        });
                    }else{
                        res.setHeader('Content-disposition', 'attachment; filename='+filename);
                        res.setHeader('Content-type', 'text/'+extension);
                        res.charset = 'UTF-8';
                        res.write(data);
                        res.end();
                    }
                });
            }
        });
})

app.listen(3000, function(){
	console.log('Example app listening on port 3000');
})