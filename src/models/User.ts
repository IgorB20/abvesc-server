import {pool} from '../models/database';


export default class User{
    protected id:number;


    constructor(email:string){
        this.id = 0;//VALOR TEMPORARIO
        this.setId(email)//email para fazer uma query e selecionar o id do usuario
    }

    private async setId(email:string){//pega o id do usuario no banco
        let conn;
        try{
            conn = await pool.getConnection();
            const rows = await conn.query("SELECT idusuario FROM usuario WHERE email = ?", [email]);
            this.id = rows[0].idusuario;
        }catch(err){
            throw err;
        }
    }

    async setAdmin(){//configura o nivel de usuario
        let conn;
        let row;
        let level = 0;        
        try{
            conn = await pool.getConnection();
            row = await conn.query("SELECT * FROM chefes WHERE idchefe = ?", [this.id]);
            if(row.length > 0){//se estiver na tabela de chefes
                row = await conn.query("SELECT isAdmin from chefes where idchefe = ? ", [this.id])
                if(row[0].isAdmin == 1){//se estiver na tabela de chefes e o campo isadmin for true
                    level = 2;
                }else{
                    level = 1;
                }
            }
        }catch(err){
            throw err;
        }

        return level;
    }

    async logar(email:string, senha:string) {
        let conn;
        let rows;
        try{
            conn = await pool.getConnection();
            rows = await conn.query("SELECT * FROM usuario WHERE email = ? and senha = ?", [email, senha]);
            
        }catch(err){
            throw err;
        }
    
        return rows;
    }

  
    static async getNormas(sql:string){
        let conn;
        let rows;
        try{
            conn = await pool.getConnection();
            rows = await conn.query(sql);
            
        }catch(err){
            throw err;
        }
    
        return rows;
    }

    // async getNormativaSobVotacao(id:string){
    //     let conn;
    //     let rows;
    //     try{
    //         conn = await pool.getConnection();
    //         rows = await conn.query(`select n.nome, n.path, nv.data_limite, uv.votou from instrucoesnormativas as n
    //                                     inner join normativas_sob_votacao as nv
    //                                         on n.idNormativa = nv.idNormativa
    //                                     inner join usuario_voto as uv
    //                                         on nv.idNormativa = uv.idNormativa_sob_voto
    //                                     where uv.idusuario = ? and n.idNormativa = ?`, [this.id, id]);
            
    //     }catch(err){
    //         throw err;
    //     }

    //     return rows;
    // }

    async insertUser(idnormativa:string){//insere usuário na tabela associativa de votos das instrucoes
        let conn;
        try{
            conn = await pool.getConnection();
           await conn.query(`INSERT INTO usuario_voto VALUES(?, ?, false)`, [this.id, idnormativa]);
            
        }catch(err){
            throw err;
        }
    }

    async listAdminUsers(){
        let conn;
        let rows;
        try{
            conn = await pool.getConnection();
            rows = await conn.query('select * from chefes');
        }catch(err){
            throw err;
        }

        return rows;
    }
    static async getApostilas(){
        let conn;
        let rows;
        try{
            conn = await pool.getConnection();
            rows = await conn.query('select * from apostilas');
        }catch(err){
            throw err;
        }

        return rows;
    
    }
    static async getNotasTecnicas(){
        let conn;
        let rows;
        try{
            conn = await pool.getConnection();
            rows = await conn.query('select * from notas_tecnicas');
        }catch(err){
            throw err;
        }

        return rows;
    
    }
//////////////////////////////////////////////////////////////////////////////////
    async cadastrarNormativa(nome:string, path:string, emAnalise:boolean){
        let conn;
        try{
            conn = await pool.getConnection();
            await conn.query(`INSERT INTO instrucoesnormativas(nome, data, path, emAnalise) VALUES (?,now(),?,?)`,[nome, path, emAnalise]);
            
        }catch(err){
            throw err;
        }
    }

    async cadastrarApostila(nome:string, path:string){
        let conn;
        try{
            conn = await pool.getConnection();
            await conn.query(`INSERT INTO apostilas(nome, data, path) VALUES (?,now(),?)`,[nome, path]);
            
        }catch(err){
            throw err;
        }
    }
    async cadastrarNotaTecnica(nome:string, path:string){
        let conn;
        try{
            conn = await pool.getConnection();
            await conn.query(`INSERT INTO notas_tecnicas(nome, data, path) VALUES (?,now(),?)`,[nome, path]);
            
        }catch(err){
            throw err;
        }
    }

    //cria o cronograma no banco de dados do tempo em que determinada normativa ficará em análise
    async setLimitTime(nomeNormativa:string){
        let conn;
        let days = 30;//tempo que a normativa fica em analise para depois ser adicionada na votação
        try{
            conn = await pool.getConnection();
            //MUDAR EVENTO PARA EXLCUIR NORMATIVA DEPOIS DE TRINTA DIAS(OU NAO, PERGUNTAR PRO PROFESSOR)
            await conn.query(`create event tempoAnalise${nomeNormativa}	
                              on schedule at current_timestamp + interval ${days} day
                              do update abvesc.instrucoesnormativas set emAnalise = false
                              where nome = ?`,[nomeNormativa]);
            
        }catch(err){
            throw err;
        }
    }


    async votar(sql:string, idNormativa:string){
        let conn;
        try{
            conn = await pool.getConnection();
            await conn.query(sql, [idNormativa]);
            await conn.query('UPDATE usuario_voto set votou = true where idNormativa_sob_voto = ? and idusuario = ?', [idNormativa, this.id])
        }catch(err){
            throw err;
        }
    }

    static async getEvents(){
        let conn;
        let events;
        try{
            conn = await pool.getConnection();
            events = await conn.query("SELECT * FROM EVENTOS");
        }catch(err){
            throw err;
        }

        return events;
    }

    static async getUserData(uid:string){
        let conn;
        let data;
        try{
            conn = await pool.getConnection();
            data = await conn.query("SELECT * FROM usuario WHERE hash = ?", [uid]);
        }catch(err){
            throw err;
        }

        return data[0];
    }

    async cadastrarUsuario(nome:string, email:string, uid:string, type:string){
        let conn;
        let idchefe;
        try{
            conn = await pool.getConnection();
            switch(type){
                
                case '1'://CORPORAÇÃO
                    await conn.query("INSERT INTO usuario(nome, email, hash) VALUES(?,?,?)", [nome, email, uid]);
                    idchefe = await conn.query("SELECT idusuario FROM usuario WHERE hash = ?", [uid]);
                    console.log(idchefe)
                    await conn.query("INSERT INTO chefes(idchefe, isAdmin) VALUES(?,?)", [idchefe[0].idusuario, 0]);//MUDAR O NOME DA TABELA DE CHEFES PARA CORPORAÇÕES
                    break;
                case '2'://ADMINISTRADOR
                    await conn.query("INSERT INTO usuario(nome, email, hash) VALUES(?,?,?)", [nome, email, uid]);
                    idchefe = await conn.query("SELECT idusuario FROM usuario WHERE hash = ?", [uid]);
                    await conn.query("INSERT INTO chefes(idchefe, isAdmin) VALUES(?,?)", [idchefe[0].idusuario, 1]);
                    break;
            }
            
        }catch(err){
            throw err;
        }
    }

    static async updateUser(nome:string, email:string, senha:string, uid:string){
        let conn;
        let message;
        try{
            conn = await pool.getConnection();
            await conn.query("UPDATE usuario SET nome = ?, email = ?, senha = ?, hash = ? WHERE hash = ?", [nome, email, senha, '', uid]);
            message = 'Dados atualizados com sucesso!';
        }catch(err){
            throw err;
            message = 'Erro ao atualizar dados, tente novamente'
        }

        return message
    }
    async getVotos(idnormativa:string){
        let conn;
        let votos;
        try{
            conn = await pool.getConnection();
            votos = await conn.query('SELECT votosContra, votosAfavor FROM normativas_sob_votacao WHERE idNormativa = ?',[idnormativa]);
        }catch(err){
            throw err;
        }

        return votos[0];
    }

    // async encerrarVotacao(idnormativa:string){
    //     let conn;
        
    //     try{
    //         conn = await pool.getConnection();
    //         await conn.query('DELETE FROM usuario_voto WHERE idNormativa_sob_voto = ?', [idnormativa])
    //         await conn.query('DELETE FROM normativas_sob_votacao WHERE idNormativa = ?', [idnormativa])
    //     }catch(err){
    //         throw err;
    //     }
    // }
    async deleteNormativa(idnormativa:string){
        let conn;
        try{
            conn = await pool.getConnection();
            await conn.query('DELETE FROM instrucoesnormativas WHERE idNormativa = ?', [idnormativa])
        }catch(err){
            throw err;
        }
    }

    //em caso de empate reseta a votação de determinada normativa
    // async resetVote(idnormativa:string){
    //     let conn;
        
    //     try{
    //         conn = await pool.getConnection();
    //         await conn.query('UPDATE usuario_voto SET votou = 0 WHERE idNormativa_sob_voto = ?', [idnormativa]);
    //         await conn.query('UPDATE normativas_sob_votacao SET votosAfavor = ?, votosContra = ? WHERE idNormativa = ?', [0,0,idnormativa]);
    //     }catch(err){
    //         throw err;
    //     }
    // }

    async cadastrarEvento(titulo:string, descricao:string, data:string, local:string, file_src:string){
        
        let conn;
        try{
            conn = await pool.getConnection();
            await conn.query('INSERT INTO eventos(nome, descricao, data, local, arquivo) VALUES (?,?,?,?,?)', [titulo, descricao, data, local, file_src]);
            return 'Evento cadastrado com sucesso!';
           
        }catch(err){
            return 'Erro ao cadastrar evento!'+err;
        }
    }
    async getEvento(idevento:string){
        let conn;
        let evento;
        try{
            conn = await pool.getConnection();
            evento = await conn.query('SELECT * FROM eventos WHERE idevento = ?', [idevento]);
          
           
        }catch(err){
           throw err;
        }
        return evento[0]
    }
    async deleteEvent(idevento:string){
        let conn;
        try{
            conn = await pool.getConnection();
            await conn.query('DELETE FROM eventos WHERE idevento = ?', [idevento])
            return true;
        }catch(err){
            return false;
            // throw err
            
        }
    }
}

