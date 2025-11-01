import express from 'express';
import WebSocket from 'ws';
import path from 'path';
import fs from 'fs';
import bodyParser from 'body-parser';
import UserController from './src/controllers/UserController';
import multer from 'multer';
import cheerio from 'cheerio';
import request from 'request';
import {pool} from './src/models/database'//SERÁ???
import process from 'process';

let HOST:string;
//define o endereco de ip do servidor
if(process.argv[2] == undefined){
    HOST = '127.0.0.1';
}else{
    HOST = (process.argv[2]);
}


let userController: UserController;
userController = new UserController();

const fileDirectory: string = `${__dirname}/files/`//diretório dos arquivos das instruções normativas
const imagesDirectory: string = `${__dirname}/imagens/`//diretório das imagens dos eventos 

const upload = multer({ dest: './files/' })

const app = express();
app.use(express.static('../app/www'));

//BODY PARSER
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());





// const wss = new WebSocket.Server({ port: 3000, host: "192.168.0.3" });

// wss.on('connection', async function connection(ws) {
//     ws.on('message', function incoming(message) {
//         console.log('received: %s', message);
//     });
//     ws.send("Esta mensagem veio do servidor!")
// })



app.get('/host', (req, res)=>{
    res.send(HOST);
})

app.get('/inicio', (req, res) => {
    res.sendFile(path.join(__dirname + '/../app/www/index.html'));
})


//ROTA RESPONSÁVEL POR REALIZAR O LOGIN
app.post('/login', async (req, res) => {

    let response = await userController.validaLogin(req.body.email, req.body.senha);
    res.send(response);

})

//cadastro de usuários pelo usuario administrador
app.post('/cadastro', async (req, res) => {
   
    let response = await userController.cadastrarUsuario(req.body.nome, req.body.email, req.body.userType);
    res.send(response);

})

app.post('/updateUser', async (req, res)=>{
    console.log(req.body);
    res.send(await UserController.updateUserData(req.body.nome, req.body.email, req.body.senha, req.body.uid));
})

app.get('/userData/:uid', async(req, res)=>{
    res.send(await userController.sendUserData(req.params.uid));
})

//rota de download de normativas
app.get('/download/:filename', function (req, res) {
    console.log(req.params.filename)
    //rota recebe como parametro o nome do arquivo a ser baixado
    var file = `${fileDirectory}${req.params.filename}`;
    console.log(file);
    res.download(file)

});

//rota que envia as opcoes do menu se o usuario estiver logado ou se nao estiver
app.get('/menu', (req, res) => {
    if (userController.isLogado()) {
        res.send(userController.sendMenuOptions());
    } else {
        res.send('Logar');
    }
})

//retorna todas as normativas de determinada lista(em votação, em análise ou prontas)
app.get('/normativas/:num', async (req, res) => {
    res.send(await userController.sendNormas(parseInt(req.params.num)));
})



//retorna uma normativa em votacao especifica
// app.get('/normativa-sob-votacao/:id', async (req, res) => {
   
//     let data = await userController.sendNormativaSobVotacao(req.params.id);
//     if(data == ''){
//         res.send(await userController.sendNormativaSobVotacao(req.params.id));
//     }else{
//         res.send(data)
//     }
//     // console.log(data)
    
    
// })

//upload de arquivos no sistema
app.post('/upload-file', upload.single('filetoupload'), async (req, res) => {
    console.log(req.body)
    let oldpath = req.file.path;
    let newpath = fileDirectory + req.file.originalname;

    try {
        fs.rename(oldpath, newpath, (err) => {
            if (err) throw err;
            console.log('Rename complete!!!!');

        })
        console.log(req.body);
        await userController.cadastrarArquivo(req.body.nome, req.file.originalname, req.body.type)

        res.send('<span class="sucess">Cadastro completado com sucesso!</span>');
    } catch (err) {

        res.send('<span class="error">Erro ao cadastrar normativa</span>');
        throw err;
    }
})

//upload de eventos
app.post('/upload-evento', upload.single('filetoupload'), async (req, res) => {
    console.log(req.body)
    if (req.file == undefined) {
        console.log('não veio nenhum arquivo')
        res.send(await userController.cadastrarEvento(req.body.titulo, req.body.descricao, req.body.data, req.body.time, req.body.local, 'null'));
    } else {
        let oldpath = req.file.path;
        let newpath = fileDirectory + req.file.originalname;

        try {
            fs.rename(oldpath, newpath, (err) => {
                if (err) throw err;
                console.log('Rename complete!!!!');

            })

            res.send(await userController.cadastrarEvento(req.body.titulo, req.body.descricao, req.body.data, req.body.time, req.body.local, req.file.originalname));
        } catch (err) {

            res.send('Erro ao cadastrar normativa');
            throw err;
        }
    }
    
})

app.get('/apostilas', async (req, res)=>{
    res.send(await userController.sendApostilas());
})

app.get('/notas-tecnicas', async (req, res)=>{
    res.send(await userController.sendNotasTecnicas());
})

/*rota responsável por acessar o site da ABVESC e fazer o scraping das noticias para 
disponibilizá-las no aplicativo
*/
app.get('/scraping', async (req, res) => {

    let json: any = [];
    let titles: any = [];
    let resumos: any = [];
    let images: any = [];
    let datas: any = [];

    // scrapeIt("https://ionicabizau.net", {
    //     title: ".header h1"
    //   , desc: ".header h2"
    //   , avatar: {
    //         selector: ".header img"
    //       , attr: "src"
    //     }
    // }).then(({ data, response }) => {
    //     console.log(`Status Code: ${response.statusCode}`)
    //     console.log(data)
    // })
    
    request({ uri: 'http://www.abvesc.com.br/' },

        function (error, response, body) {
            const $ = cheerio.load(body);

            //procura os titulos das noticias
            $('div[id=LayoutGrid8]').find('div[class=col-1] h1[id="Heading1"] a').each((index, el) => {
                // data += '<div class="card">'+ $(el).html() + '</div>';
                titles.push($(el).text());
            });

            //procura os resumos das notícias
            $('div[id=LayoutGrid8]').find('div[class=col-1] div[id="wb_Text4"] span a').each((index, el) => {

                resumos.push($(el).text());
            });

            //procura as imagens das noticias
            $('div[id=LayoutGrid8]').find('div[class=col-1] div[class="imgMoldura"] a').each((index, el) => {

                images.push($(el).html());

            });
            //procura as datas das noticias
            $('div[id=LayoutGrid8]').find('div[class=col-1] div[id="wb_Heading1"] span').each((index, el) => {
                // data += '<div class="card">'+ $(el).html() + '</div>';
                datas.push($(el).text());
            });

            //adiciona todos os vetores, de titulo, resumo, imagem e data em um json para enviar ao cliente
            titles.forEach((title: any, i: number) => {
                let dados = {
                    titulo: title,
                    resumo: resumos[i],
                    image: images[i],
                    data: datas[i]
                }
                json.push(dados);
            });



            res.send(json);
        }

    )


})

//ROTA RESPONSÁVEL PELO VOTO
// app.post('/votar', async (req, res)=>{
//     // console.log(req.body.idNormativa)
//     res.send(await userController.votar(req.body.voto, req.body.idNormativa));
// })

//rota que retorna os eventos da abvesc do banco
app.get('/eventos', async (req, res)=>{
    res.send(await userController.sendEvents());
})

// app.post('/cadastrar-evento', async (req, res)=>{
//     // res.send(await userController.cadastrarEvento())
//     console.log(req.body)
//     res.send(await userController.cadastrarEvento(req.body));
// })

//retorna um evento específico
app.get('/evento/:idevento', async(req,res)=>{
    res.send(await userController.getEvento(req.params.idevento))
})

//envia uma imagem para o cliente
app.get('/imagens/:file', (req, res) => {
    res.sendFile(imagesDirectory + req.params.file);
});

// app.get('/encerrar_votacao/:idnormativa', async (req, res)=>{
//     res.send(await userController.encerrarVotacao(req.params.idnormativa));
// })
app.get('/delete-event/:idevento', async (req, res)=>{
    res.send(await userController.deleteEvent(req.params.idevento));
})



app.listen(8080, HOST, () => {
    console.log("Conexão estabelecida com sucesso!")
})