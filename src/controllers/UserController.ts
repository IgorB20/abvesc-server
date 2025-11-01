
import User from '../models/User';
import crypto, { createHash } from 'crypto';
import nodemailer from 'nodemailer';

export default class UserController {
    private admin: Number;
    private user!: User;
    protected logado: boolean;

    constructor() {

        this.admin = 0;//valor inicial
        this.logado = false;

    }

    isLogado() {
        return this.logado;
    }

    sendMenuOptions() {//AS OPCÇÕES DO MENU VARIAM DEPENDENDO DA PERMISSAO DO USUARIO
        let opcoes;
        let menu: any = [];
   
        if (this.admin == 2) {//SE O USUÁRIO FOR UM SUPER ADMINISTRADOR
            opcoes = ['Início', 'História', 'Corporações', 'Notícias', 'Cadastrar arquivos', 'Cadastrar evento', 'Cadastrar novo usuário','Sair'];
            let paths = ['./index.html', '#', '#', './noticias.html', './cadastroNormativa.html', './cadastroEvento.html', './cadastrarUsuario.html','#'];//EDITAR PARA OS RESPECTIVOS CAMINHOS DE CADA OPCAO DO MENU

            opcoes.forEach((item, i) => {
                menu.push({ op: item, path: paths[i] })//adiciona cada opcao em um array com seu respectivo caminho
            })

        }else if(this.admin == 1) {//SE O USUÁRIO FOR UM ADMINISTRADOR
            
            opcoes = ['Início', 'História', 'Corporações', 'Notícias', 'Sair'];
            let paths = ['./index.html', '#', '#', './noticias.html', './cadastroNormativa.html', '#', '#'];//EDITAR PARA OS RESPECTIVOS CAMINHOS DE CADA OPCAO DO MENU
            opcoes.forEach((item, i) => {
                menu.push({ op: item, path: paths[i] })//adiciona cada opcao em um array com seu respectivo caminho
            })

        }else{//SE FOR UM USUÁRIO COMUM
            opcoes = ['Início', 'História', 'Corporações', 'Notícias', 'Sair'];
            let paths = ['./index.html', '#', '#', './noticias.html', '#'];
            opcoes.forEach((item, i) => {
                menu.push({ op: item, path: paths[i] })//adiciona cada opcao em um array com seu respectivo caminho
            })
        }
           

        

        return JSON.stringify(menu);
    }

     async validaLogin(email: string, senha: string) {//função que valida o login do usuario
        this.user = new User(email);
        let rows = await this.user.logar(email, senha)

        if (rows.length > 0) {
            this.logado = true;
            let n  = await this.user.setAdmin();
           
            this.admin = n;
            return true
        } else {
            return false
        }
    }
    // async logout(){

    // }

   
    /*
    método que envia a lista de instrucoes normativas, envia lista de normativas prontas
    se n = 1, lista de normativas em analise se n = 2 e lista de normativas em votação se n = 3
    */
    async sendNormas(n: number) {
        let sql: string = '';

        /*
            1 - votação
            2 - analise
            3 - pronta 
        */
        if(!this.logado && n === 1 || !this.logado && n === 2){//usuários nao logados nao tem acesso as normativas em analise
            return;
        }else{
            if (this.admin == 0 && n === 1) {//USUÁRIOS QUE NÃO SÃO ADMINS NÃO PODEM VER A LISTA DE NORMATIVAS EM VOTAÇÃO
                return
            } else {
                switch (n) {
                    case 3:
                        sql = `select * from abvesc.instrucoesnormativas as n 
                            left join abvesc.normativas_sob_votacao as nv
                                on n.idNormativa = nv.idNormativa
                            where emAnalise is false and nv.idNormativa is null order by data asc`;
                        break;
                    case 2:
                        sql = "select * from abvesc.instrucoesnormativas where emAnalise is true order by data asc"
                        break;
                    case 1:
                        sql = `select n.nome, n.data, n.path, n.idNormativa from abvesc.instrucoesnormativas as n
                                inner join abvesc.normativas_sob_votacao as nv
                                    on nv.idNormativa = n.idNormativa` 
                        //`select n.nome, n.data, n.path, n.idNormativa from abvesc.usuario_voto as uv
                        //     inner join abvesc.normativas_sob_votacao as nv
                        //         on uv.idNormativa_sob_voto = nv.idNormativa
                        //     inner join abvesc.instrucoesnormativas as n
                        //         on nv.idNormativa = n.idNormativa`;
                }
    
                return await User.getNormas(sql);
            }
        }
        

    }

    async sendApostilas(){
        return await User.getApostilas();
    }

    async sendNotasTecnicas(){
        return await User.getNotasTecnicas();
    }


    //envia uma normativa que esteja em votação
    // async sendNormativaSobVotacao(id:string) {
        
    //     let iconsOrNot;//variavel que armazena os icones de sim ou nao se o usuario não votou ainda, ou armazena a mensagaem de voto concluido
    //     let json;
    //     let end_voting = '';


    //     let rows = await this.user.getNormativaSobVotacao(id);
    //     if(rows.length == 0){//é necessário inserir o usuário na tabela de votos 
    //         await this.user.insertUser(id);
    //         json = '';
    //         // this.sendNormativaSobVotacao(id);
    //     }else{
    //         if (rows[0].votou == 1) {
    //             iconsOrNot = '<span class="text-voto-area">Voto realizado</span>'
    //         } else {
    //             iconsOrNot = `<i class="fas fa-check-circle"></i>
    //             <i class="fas fa-times-circle"></i>`
    //             // iconsOrNot = `<i class="fas fa-thumbs-up hand"></i>
    //             //             <i class="fas fa-thumbs-down hand"></i>`
    //         }
    
    //         if(this.admin == 2){//SUPER ADMINISTRADOR
    //             end_voting = `<button class = "button">Encerrar votação</button>`
    //         }
    //         // if (this.admin == 1){//ADMINISTRADOR
    //             // if (rows[0].votou == 1) {
    //             //     iconsOrNot = '<span class="text-voto-area">Voto realizado</span>'
    //             // } else {
    //             //     iconsOrNot = `<i class="fas fa-thumbs-up hand"></i>
    //             //                 <i class="fas fa-thumbs-down hand"></i>`
    //             // }
    
    //         // } 
    //         // else {
    //         //     iconsOrNot = '<span class="text-voto-area">Você não tem permissão para votar</span>'
    //         // }
    
    //         json = {
    //             nome: rows[0].nome,
    //             path: rows[0].path,
    //             data_limite: rows[0].data_limite,
    //             iconsOrNot: iconsOrNot,
    //             end_voting: end_voting
    //         }
    //     }
       
        

        

    //     return json;

       
    // }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    async cadastrarArquivo(nome: string, path: string, type: string) {
        // let emAnalise: boolean;

        switch(type){
            case '1'://normativa pronta
                this.user.cadastrarNormativa(nome, path, false);
                break;
            case '2'://normativa em consulta pública
                this.user.cadastrarNormativa(nome, path, true);
                //limitTime???
                break;
            case '3'://apostila
                this.user.cadastrarApostila(nome, path)
                break;
            case '4'://nota técnica
                this.user.cadastrarNotaTecnica(nome, path)
                break;

        }
        // if (type === '1') {//normativa pronta
        //     this.user.cadastrarNormativa(nome, path, false);
        // } else {
        //     emAnalise = true;
        //     await this.user.cadastrarNormativa(nome, path, true);
        //     // this.user.setLimitTime(nome);//se a normativa for cadastrada como em analise ela fica no maximo 30 dias mesta condição
        // }

        
    }

    // async votar(voto:string, idNormativa:string){
    //     let rows = await this.user.getNormativaSobVotacao(idNormativa);
    //     if(rows[0].votou == 0){//se o usuário não tiver votado ainda
    //         let sql:string;
    //         if(voto == '0'){//voto contra
    //             sql = 'update normativas_sob_votacao set votosContra = votosContra + 1 where idNormativa = ?';
    //         }else{//voto a favor
    //             sql = 'update normativas_sob_votacao set votosAfavor = votosAfavor + 1 where idNormativa = ?';
    //         }

    //         this.user.votar(sql, idNormativa);
    //     }

    //     return '<span class="text-voto-area">Voto realizado</span>'
    // }

    async sendEvents(){
        let events = await User.getEvents();
        return events;
    }

    async cadastrarUsuario(nome:string, email:string, type:string){
        // console.log(email);
        let uid = 'klbn'+Math.random()*100000+'taee';
        const hash = createHash('md5');
        hash.update(uid);
        // console.log(hash.digest('hex'));
        uid = hash.digest('hex');
        switch(type){
            case '1':
                //usuario é uma corporação
                break
            case '2':
                //usuario é um super administrador
                break;
        }
        this.user.cadastrarUsuario(nome, email, uid, type);

     

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: "benedetigor@gmail.com",
                pass: "#cardaco9"
            },
            tls: { rejectUnauthorized: false}
          });

          const mailOptions = {
            from: 'benedetigor@gmail.com',
            to: email,
            subject: 'abvesc',
            text: `Email de confirmação: acesse este link para definir sua nova senha http://127.0.0.1:8080/atualizarDados.html?uid=${uid}`
          };

          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log('Email enviado: ' + info.response);
            }
          });
        
          
        return 'Usuário cadastrado';
    }

    static async updateUserData(nome:string, email:string, senha:string, uid:string){
        
        return await User.updateUser(nome, email, senha, uid );
    }

    async sendUserData(uid:string){
        let data = await User.getUserData(uid);
        return {
            nome:data.nome,
            email:data.email
        }
    }

    // async encerrarVotacao(idnormativa:string){
    //     let votos = await this.user.getVotos(idnormativa);
    //     let votos_totais = votos.votosContra + votos.votosAfavor;
    //     let votos_contra;
    //     let votos_afavor;

    //     if(votos.votosContra == 0  && votos.votos_afavor == 0){//NÃO FUNCIONA!!!!
    //         votos_contra = 0;
    //         votos_afavor = 0;
    //     }else{
    //          //EM PORCENTAGEM;
    //         votos_contra = ((votos.votosContra/votos_totais)*100).toFixed(1);
    //         votos_afavor = ((votos.votosAfavor/votos_totais)*100).toFixed(1);
    //     }
    
    //     let message;
    //     if(votos_afavor > votos_contra){
    //         message = 'Aprovada!';
    //         // this.user.encerrarVotacao(idnormativa);//exclui a normativa das tabelas de votação do banco

    //     }else if(votos_afavor < votos_contra){
    //         message = 'Reprovada!'
    //         this.user.encerrarVotacao(idnormativa);
    //         this.user.deleteNormativa(idnormativa);
    //     }else{
    //         this.user.resetVote(idnormativa);
    //         message = 'Empate! Será iniciada uma nova votação!';
    //         //é necessário ter outra votação!!!!
    //     }

    //     return JSON.stringify({contra:votos_contra, afavor:votos_afavor, message})
    // }

    async cadastrarEvento(titulo:string, descricao:string, data:string, time:string, local:string, file_src:string){
        data = data+' '+time+':00';
        return this.user.cadastrarEvento(titulo, descricao, data, local, file_src);
    }
    async getEvento(idevento:string){
        let dados_eventos = await this.user.getEvento(idevento);
        if(this.admin == 2){//se for um administrador
            dados_eventos.delete_event = `<button onclick="deleteEvent(${dados_eventos.idevento})" class="button">Excluir evento</button>`; 
            return dados_eventos
        }
        dados_eventos.delete_event = 'empty';
        return dados_eventos;
    }
    async deleteEvent(idevento:string){
        //É PRECISO EXCLUIR O ARQUIVO DO SERVIDOR!!!!!!
        if(this.user.deleteEvent(idevento)){
            return 'true';
        }else{
            return 'false';
        }
    }

}