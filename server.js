const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const validaLogin = require('./src/controllers/validaLogin');



const app = express();
app.use(express.static('../app/www'));
//BODY PARSER
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const wss = new WebSocket.Server({ port: 3000, host: "192.168.0.3" });

wss.on('connection', async function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
    });
    ws.send("Esta mensagem veio do servidor!")
})




app.get('/inicio', (req, res) => {

    res.sendFile(path.join(__dirname + '/../app/www/index.html'))
})


//ROTA RESPONSÁVEL POR REALIZAR O LOGIN
app.post('/login', async (req, res)=>{
    
    let response = await validaLogin(req.body.email, req.body.senha);
    res.send(response);
    
})



//rota de download
app.get('/download/:filename', function (req, res) {
    //rota recebe como parametro o nome do arquivo a ser baixado
    var file = `${__dirname}/files/${req.params.filename}`;
    res.download(file)
});

// //LISTAGEM DE TODOS OS ARQUIVOS DENTRO DE UM DIRETÓRIO
// fs.readdir('./files/', (err, files) => {
//     files.forEach(file => {
//         console.log(file);
//     });

// });


app.listen(8080, "192.168.0.3", () => {
    console.log("Conexão estabelecida com sucesso!")
})