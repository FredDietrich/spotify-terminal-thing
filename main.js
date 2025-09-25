import { createHash, randomBytes } from 'node:crypto'
import open from 'open'
import http from 'http'
import url from 'url'
import chalk from 'chalk'

/**
 * 
 * @param {string} arg 
 */
function log(arg, padStart = 200) {
    // console.log(arg.padStart(padStart)) // TOOD: alinhar aqui para ficar legal com um logo ascii na esquerda
    console.log(arg)
}

const CLIENT_ID = process.env.CLIENT_ID || 'cola-client-id-aqui-antes-de-usar'
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://127.0.0.1:9899/callback'
const SPOTIFY_API_BASE_URL = process.env.SPOTIFY_API_BASE_URL || 'https://api.spotify.com/v1/'
const SPOTIFY_ACCOUNTS_BASE_URL = process.env.SPOTIFY_ACCOUNTS_BASE_URL || 'https://accounts.spotify.com/'

function base64URLEncode(str) {
    return str.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function sha256(buffer) {
    return createHash('sha256').update(buffer).digest();
}

function generateBytes(size) {
    const availableChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let output = ''
    for (let i = 0; i < size; i++) {
        output += availableChars.charAt(Math.floor(Math.random() * availableChars.length))
    }
    return output
}

async function login() {
    const codeVerifier = base64URLEncode(generateBytes(128));
    const codeChallenge = base64URLEncode(sha256(codeVerifier));
    const loginUrl = new URL(SPOTIFY_ACCOUNTS_BASE_URL + 'authorize');
    loginUrl.searchParams.append('client_id', CLIENT_ID);
    loginUrl.searchParams.append('response_type', 'code');
    loginUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    loginUrl.searchParams.append('scope', 'user-read-private user-read-email user-top-read');
    loginUrl.searchParams.append('code_challenge_method', 'S256');
    loginUrl.searchParams.append('code_challenge', codeChallenge);

    await open(loginUrl.toString());

    const server = http.createServer(async (req, res) => {
        const query = url.parse(req.url, true).query;
        if (query.code) {
            const authorizationCode = query.code;
            res.end('<h1>Login deu certo, pode fechar</h1>');
            server.close();
            const token = await getTokenFromCode(authorizationCode, codeVerifier)
            const userInfo = await getUserInfo(token)
            logUser(userInfo)
            const userArtistInterests = await getUserArtistInterests(token)
            logInterests(userArtistInterests)
        }
    }).listen(9899);
}

async function getTokenFromCode(code, codeVerifier) {
    const tokenUrl = SPOTIFY_ACCOUNTS_BASE_URL + 'api/token';
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', REDIRECT_URI);
    params.append('code_verifier', codeVerifier);

    const response = await fetch(tokenUrl, {
        body: params,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    }).then(res => res.json());

    return response.access_token // TODO: tem que renovar o token e jogar no keychain do pc
}

async function getUserInfo(token) {
    return fetch(SPOTIFY_API_BASE_URL + 'me', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    }).then(res => res.json())
}

function getUserArtistInterests(token) {
    return fetch(SPOTIFY_API_BASE_URL + 'me/top/artists', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    }).then(res => res.json())
}

function logUser(user) {
    log(`Nome: ${user.display_name}`)
    log(`Premium: ${user.product == 'premium' ? chalk.green('Sim') : chalk.red('Não')}`)
    log(`Seguidores: ${user.followers.total}`)
}

function logInterests(interests) {
    log('Interesses:');
    interests.items
        .sort((item1, item2) => item1.popularity + item2.popularity)
        .forEach(item => {
            log(`   * ${chalk.blue(item.name)}`)
        })
}

login()
