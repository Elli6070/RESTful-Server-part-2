var fs = require('fs')
var path = require('path')
var express = require('express')
var sqlite3 = require('sqlite3')
var bodyParser = require('body-parser');
var cors = require('cors');
var xml = require('xml-js');
var js2xmlparser = require("js2xmlparser");
var URL = require("url").URL;

var port = 8027;

var db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');
var client_file = path.join(__dirname, "docs/client.html");

var db = new sqlite3.Database(db_filename, sqlite3, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);

    }
});



var app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());
app.get('/', (req, res) => {
	res.sendFile(client_file);
});

app.get('/codes', (req, res) => {
    var codes = {};
    

    if (req.query.format != null)
    {
        var format = req.query.format;
    }
    else {
        var format = 'json';
    }
    if (req.query.code != null)
    {
        var jQ = req.query.code;
        var ArrayjQ = jQ.split(',');
        var first = parseInt(ArrayjQ[0]);
        var second = parseInt(ArrayjQ[1]);

    }
    else {
        var first = 0;
        var second = 10000;   
     }



    db.all("SELECT Codes.code AS Code, Codes.incident_type AS incident_type FROM Codes WHERE Code BETWEEN ? AND ?", [first, second], (err,rows) =>{
    
        console.log(rows.length);       
        for (var i = 0; i < rows.length; i++)
        {
    
            var code = rows[i].Code;
            var incident = rows[i].incident_type;
            codes["C" + code] = incident;
        }
        
        if (format == 'xml')
        {
            xmlRes = js2xmlparser.parse("Codes", codes);
            res.type('xml').send(xmlRes);
        }
        else{
            res.type('json').send(codes);
        }
        
    });
    
   

});



app.get('/neighborhoods', (req, res) => {
    var neighborhoods = {};

    if (req.query.format != null)
    {
        var format = req.query.format;
    }
    else {
        var format = 'json';
    }
    if (req.query.id != null)
    {
        var jQ = req.query.id;
        var ArrayjQ = jQ.split(',');
        var first = parseInt(ArrayjQ[0]);
        var second = parseInt(ArrayjQ[1]);

    }
    else {
        var first = 0;
        var second = 10000;   
     }

    db.all(`SELECT Neighborhoods.neighborhood_number AS number, Neighborhoods.neighborhood_name AS name FROM Neighborhoods
     WHERE number BETWEEN ? AND ?`,[first, second], (err,rows) =>{
    
           
        for (var i = 0; i < rows.length; i++)
        {
    
            var number = rows[i].number;
            var name = rows[i].name;
            neighborhoods["N" + number] = name;
        }
         
        if (format == 'xml')
        {
            xmlRes = js2xmlparser.parse("IDs", neighborhoods);
            res.type('xml').send(xmlRes);
        }
        else{
            res.type('json').send(neighborhoods);
        }
    });
    
   

});


app.get('/incidents', (req, res) => {
    let incidents = {};
	let url = new URL("http://localhost:"+port+req.url);
	let params = new URLSearchParams(url.search.substring(1));
	let start_date = params.get("start_date");
	let end_date = params.get("end_date");
	let code = params.get("code");
	let grid = params.get("grid");
	let id = params.get("id");
	let limit = params.get("limit");
	let format = params.get("format");
	let whereOrAnd = "WHERE";
	console.log(start_date);
	console.log(end_date);
	console.log(code);

	let query = `SELECT *
				FROM Incidents
				`;
	if(start_date != null)
	{
		query = query + whereOrAnd + " Incidents.date_time >= '" + start_date  + "T00.00.00.000'";
		if(whereOrAnd == "WHERE"){
			whereOrAnd = " AND";
		}
	}
	if(end_date != null)
	{
		query = query + whereOrAnd + " Incidents.date_time <= '" + end_date + "T24.00.00.000'";
		if(whereOrAnd == "WHERE"){
			whereOrAnd = " AND";
		}
	}
	if(code != null)
	{
		query = query + whereOrAnd + " Incidents.code IN (" + code + ")";
		if(whereOrAnd == "WHERE"){
			whereOrAnd = " AND";
		}
	}
	if(grid != null)
	{
		query = query + whereOrAnd + " Incidents.police_grid IN (" + grid + ")";
		if(whereOrAnd == "WHERE"){
			whereOrAnd = " AND";
		}
	}
	if(id != null)
	{
		query = query + whereOrAnd + " Incidents.neighborhood_number IN (" + id + ")";
		if(whereOrAnd == "WHERE"){
			whereOrAnd =  " AND";
		}
	}
	query = query + " ORDER BY Incidents.date_time DESC";
	
	if(limit != null)
	{
		query = query + " LIMIT " + limit;
	}
	console.log(query);
	
	db.all(query, (err, rows) => {
		for (var i = 0; i < rows.length; i++)
		{
			var date = rows[i].date_time.substring(0, rows[i].date_time.indexOf('T'));
			var time = rows[i].date_time.substring(rows[i].date_time.indexOf('T'));
			var code = rows[i].code;
			var incident = rows[i].incident;
			var police_grid = rows[i].police_grid;
			var neighborhood_number = rows[i].neighborhood_number;
			var block = rows[i].block;
			incidents["I" + rows[i].case_number] = {"date" : date, "time" : time, "code" : code, 
			"incident" : incident, "police_grid" : police_grid, "neighborhood_number" : neighborhood_number,
			"block" : block};
		}
		
		if(format != null && format == 'xml')
		{
			xmlQuery = `<textarea style="border:none; width:100%; height:100%">` + 
			xml.json2xml(incidents, {compact: true, spaces: 4}) + `
			</textarea>`;
			res.writeHead(200, { 'Content-Type': 'text/html' });
			res.write(xmlQuery);
		}
		else
		{
			res.type('json').send(incidents);
		}
		
	});
});

app.put('/new-incident', (req, res) => {
    var new_incident = {
        'case_number': req.body.case_number,
        'date': req.body.date,
        'time': req.body.time,
        'code': req.body.code,
        'incident': req.body.incident,
        'police_grid': req.body.police_grid,
        'neighborhood_number': req.body.neighborhood_number,
        'block': req.body.block
    };
    console.log(req.body);
    let has_num = false;
    db.all(`SELECT Incidents.case_number FROM Incidents`,  (err,rows) =>{
        for (var i = 0; i < rows.length; i++)
        {
            if (req.body.case_number == rows[i].case_number)
            {
                has_num = true;
            }
        }
        
        if (has_num) {
            res.status(500).send('Error: incident already exists');
        }

        db.run(`INSERT INTO Incidents VALUES(?, ?, ?, ?, ?, ?, ?)`,
        [new_incident['case_number'], 
        new_incident['date']+new_incident['time']+"T",
        new_incident['code'], 
        new_incident['incident'], 
        new_incident['police_grid'],
        new_incident['neighborhood_number'],
        new_incident['block']]);

        
    });

    

});

console.log('Now listening on port ' + port);
app.listen(port);