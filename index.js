const WebSocket = require('ws')
var fs = require('fs');
require('dotenv').config();


var masheryLogStreamUrl =  process.env.URL;
const fieldsToIgnore=['ssl_enabled','service_definition_endpoint_uuid','request_id','plan_uuid','package_uuid','oauth_access_token','quota_value','qps_throttle_value']
const client = new WebSocket(masheryLogStreamUrl);
 
client.onmessage = e => {
    handleDataEvent(e)
}

function handleDataEvent(e){
    
   var dataArray = JSON.parse(e.data.toString('utf8')).data
   
    //handle each data item for the event
    dataArray.forEach( function(data){
        //mask any api keys before they are logged but keep unknown keys 
        data.api_key = data.api_key=='unknown'?'unknown':'*masked*'
        
        //Some simple logic to filter out non-interesting events
        if( data.response_string!='200_OK_API' | data.traffic_manager_error_code!='-'){  
            //logToConsole(data)
            //remove any fields that have been added to the ignore array
            fieldsToIgnore.forEach(field =>{
                delete data[field]
            })
            writeToSplunkLog(data)
        }
    })
}

function writeToSplunkLog(parsedData){

    //Currently subtracting 7 hours from UTC to match MST time 
    var timeStamp = new Date()
    timeStamp.setHours(timeStamp.getHours() - 7)
    timeStamp = timeStamp.toISOString().replace('T', ' ');
    timeStamp = timeStamp.replace('Z','')
    
    var formattedData = '' 
    Object.keys(parsedData).forEach(function(key){
        if(parsedData[key]!='-'){formattedData += key+'='+parsedData[key] + ' '}    
    })
    
    //Write to the log file
    const logFileName = 'masherystream.log'
    var errorHandlerFunction =  function(err){if(err!=null){console.log(err)}}
    var logEntry =   timeStamp + ' {} [main] ' +  formattedData + '\n'
    fs.appendFile(logFileName, logEntry, errorHandlerFunction)
}


//helper function and constant used to benchmark the logger
/*const startTime = new Date();
var numberOfEvents = 0;
function logToConsole(data){
       var dataToLog = {     
            'remote_total_time' :  data.remote_total_time,
            'src_ip' : data.src_ip,
            'api_method_name' : data.api_method_name,
            'service_name' : data.service_name,
            'uri' : data.uri
        }
        numberOfEvents++;
        console.log("number of events handled: " + numberOfEvents + "\n TotalTime:" + ((startTime.getTime() - (new Date()).getTime())/(-1000)))
        console.log(data)   
}
*/
