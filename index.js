const WebSocket = require('ws')
var fs = require('fs');
require('dotenv').config();

var masheryLogStreamUrl =  process.env.URL;
const client = new WebSocket(masheryLogStreamUrl);
 
client.onmessage = e => {

    handleDataEvent(e)

}


function handleDataEvent(e){
    
   var dataArray = JSON.parse(e.data.toString('utf8')).data
   
    //add the data to the event log
    dataArray.forEach( function(data){
      
        var dataToLog = {     
            'remote_total_time' :  data.remote_total_time,
            'src_ip' : data.src_ip,
            'api_method_name' : data.api_method_name,
            'service_name' : data.service_name,
            'uri' : data.uri
        }
        
        //mask any api keys before they are logged
        data.api_key = data.api_key=='unknown'?'unknown':'*masked*'
        
        //Some simple logic to filter out non-interesting events
        if( data.response_string!='200_OK_API' | data.traffic_manager_error_code!='-'){  
            console.log(data)
            writeToSplunkLog(data);
        }
        }
    )
}


function writeToSplunkLog(parsedData){

    //Currently subtracting 7 hours from UTC to match MST time 
    var timeStamp = new Date()
    timeStamp.setHours(timeStamp.getHours() - 7)
    timeStamp = timeStamp.toISOString().replace('T', ' ');
    timeStamp = timeStamp.replace('Z','')
    
    var formattedData = '' 
    Object.keys(parsedData).forEach(function(key){formattedData += key+'='+parsedData[key] + ' '})
    
    //fs.appendFile('masheryLog.log', '\n' + JSON.stringify(parsedData, null, 2) + '\n', function(err){console.log(err)})
    //For now mimic an empty thread context and [main]
    fs.appendFile('masheryLog.log',   timeStamp + ' {} [main] ' +  formattedData + '\n', function(err){console.log(err)})
    

}