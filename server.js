//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var token = 'EAABq5aOj6fIBADE4Wvm0C3FrSkQZBuVv57oYtiJEa2w26KDEnKwDEfzNVt6CZCjPIdSRtE6AHLjsmq97MWCp3iVKYCrg9vUKSDma5QI13Gc5ZA71WmGGKTclW2V29hxnVADdlPClIWm97XXS4A69Ok3HwclYV9ZB01ZC1nZCfsgQZDZD';

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended:false}));
var messages = [];
var sockets = [];

//Validação Se Realmente É A Nossa Pagina que esta querendo utilizar o bot

router.get('/webhook', function (req, res) {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === 'boutique123') {
    console.log('Validação Ok');
    res.status(200).send(req.query['hub.challenge']);
  }
  else {
    console.log('Validação Falhou');
    res.sendStatus(403);
  }
});

//
router.post('/webhook', function (req, res) {
  var data = req.body;
  
  if (data && data.object === 'page') {
    data.entry.forEach(function (entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;
      
      entry.messaging.forEach(function (event) {
        if (event.message) {
          tratarMensagem(event);
        }
        else {
          if (event.postback && event.postback.payload) {
            //quando clicar no botão, apresentar mensagem inicial
            if (event.postback.payload == 'clicou_comecar') {
              sendTextMessage(event.sender.id, 'Como posso te ajudar, veja as opçõe disponíveis abaixo:\n' +
                                                 '\nCamisa, \nCalça, \nBermuda, \nCamiseta, \nCasaco');
            }
            console.log('Payload', event.postback.payload);
          }
        }
      })
    })
    
    res.sendStatus(200);
  }
});

function tratarMensagem(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;
  
  console.log('Messagem recebida do usuário %d página %d', senderID, recipientID);
  
  var messageID = message.mid;
  var messageText = message.text;
  var files = message.attachments;
  
  if (messageText) {
    switch (messageText) {
      case 'oi':
      case 'olá':
      case 'ola':
        sendTextMessage(senderID, 'Oi, tudo bem com você? Em que posso ajudar?');
        break;
      case 'tchau':
      case 'até logo':
      case 'ate':
        sendTextMessage(senderID, 'Até breve, espero ter ajudado. :)');
        break;
      case 'obrigado':
      case 'obrigada':
        sendTextMessage(senderID, 'Por nada, é um prazer ajudar. ;)');
        break; 
      case 'Calça':
      case 'calça':
        sendTextMessage(senderID, 'Calças A Partir de R$90,00, verifique os modelos e tamanhos no nosso site: https://www.facebook.com/Boutique-Federal-138995500019141/');
        break;
      case 'Bermuda':
      case 'bermuda':
        sendTextMessage(senderID, 'Bermudas A Partir de R$50,00, verifique os modelos e tamanhos no nosso site: https://www.facebook.com/Boutique-Federal-138995500019141/');
        break;
      case 'Camisa':
      case 'camisa':
        sendTextMessage(senderID, 'Camisas A Partir de R$ 40,00, verifique os modelos e tamanhos no nosso site: https://www.facebook.com/Boutique-Federal-138995500019141/');
        break;
      case 'Casaco':
      case 'casaco':
        sendTextMessage(senderID, 'Casacos A Partir de R$ 100,00, verifique os modelos e tamanhos no nosso site: https://www.facebook.com/Boutique-Federal-138995500019141/');
        break;
      case 'Camiseta':
      case 'camiseta':
        sendTextMessage(senderID,'Camisetas A Partir de R$70,00, verifique os modelos e tamanhos no nosso site: https://www.facebook.com/Boutique-Federal-138995500019141/');
        break;
        
      default:
        sendTextMessage(senderID, 'Desculpe, não compreendi.');
        break;
    }
  }
    else if(files) {
      console.log('Anexos');
    }
}

function sendTextMessage(recipientID, messageText) {
  var messageData = {
    recipient: {
      id: recipientID
    },
    
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}
  
  function callSendAPI (messageData) {
    request({
      uri: 'https://graph.facebook.com/v2.6/me/messages',
      qs: { access_token: token},
        method: 'POST',
        json: messageData
      }, function(error, response, body) {
        
        if (!error && response.statusCode == 200) {
          console.log('Mensagem enviada com sucecsso.');
          var repicientID = body.recipient_id;
          var messageID = body.message_id;
        }
        else {
          console.log('Não foi possível enviar a mensagem.');
          console.log(error);
        }
      })
  }
  

io.on('connection', function (socket) {
    messages.forEach(function (data) {
      socket.emit('message', data);
    });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var text = String(msg || '');

      if (!text)
        return;

      socket.get('name', function (err, name) {
        var data = {
          name: name,
          text: text
        };

        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
