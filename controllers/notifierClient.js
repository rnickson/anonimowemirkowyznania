var net = require('net');
var crypto = require('crypto');
var protobuf = require('protobufjs');
var eventMessage;
protobuf.load("./protobufs/protocol.proto", function(err, root){
    if(err)throw err;
    eventMessage = root.lookupType('protocol.Event');
});
var client = new net.Socket();

client.connect(8011, 'localhost', function(){
    console.log('Connected');
});
client.on('error', function(err){
    console.log(err);
});
client.on('close', function(){
    console.log('conection closed');
    client.setTimeout(10000, function() {
        client.connect(8011, 'localhost');
    });
});
function sendEvent(objectType, objectId){
    var message = eventMessage.create({object: objectType, id: objectId});
    var data = eventMessage.encode(message).finish();
    var packet = new Buffer(data.length + 4);
    packet.writeUInt16LE(data.length, 0); //lenght
    packet.writeUInt16LE(1, 2); //packetype
    data.copy(packet, 4);
    client.write(packet);
}

module.exports = sendEvent;