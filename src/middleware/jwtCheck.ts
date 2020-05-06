import { C1_ETH_AUTH } from "../services/user/user.service";
import { NextFunction } from "express";

var jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');

require('dotenv').config();

export function getAuth0Secret(kid: string) {
  return new Promise((resolve, reject) => {

    const client = jwksRsa({
      strictSsl: true, // Default value
      jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true
    });
    
    client.getSigningKey(kid, (_err: any, key: any) => {
      const signingKey = key.publicKey || key.rsaPublicKey;
      resolve(signingKey);
    });
  });
}

export function verifyAuth0Token(token: string, kid: string) {
  return new Promise((resolve, reject) => {
    getAuth0Secret(kid).then((secret: any) => {
      jwt.verify(
        token, 
        secret, 
        { 
          algorithms: ['RS256'] 
        }, 
        (err: any, decodedToken: any) => {
            if (err || !decodedToken) {
              return reject(err)
            }
            resolve(decodedToken)
        }
      );
    });
  })
}

export function verifyC1Token(token: string) {
  return new Promise((resolve, reject) =>
  {
    jwt.verify(
      token, 
      process.env.JWT_SECRET, 
      { 
        algorithms: ['HS256'] 
      }, 
      (err: any, decodedToken: any) => {
          if (err || !decodedToken) {
            return reject(err)
          }
          resolve(decodedToken)
      }
    );
  })
}

export const checkJwt = (
  req: any,
  res: any,
  next: NextFunction
) => {
  let token;
  let credentialsRequired = false;

  if (req.method === 'OPTIONS' && req.headers.hasOwnProperty('access-control-request-headers')) {
    var hasAuthInAccessControl = !!~req.headers['access-control-request-headers']
                                  .split(',').map(function (header: any) {
                                    return header.trim();
                                  }).indexOf('authorization');

    if (hasAuthInAccessControl) {
      return next();
    }
  }

  if (req.headers && req.headers.authorization) {
    var parts = req.headers.authorization.split(' ');
    if (parts.length == 2) {
      var scheme = parts[0];
      var credentials = parts[1];

      if (/^Bearer$/i.test(scheme)) {
        token = credentials;
      } else {
        if (credentialsRequired) {
          return next(new Error('credentials_bad_scheme'));
        } else {
          return next();
        }
      }
    } else {
      return next(new Error('credentials_bad_format'));
    }
  }

  if (!token) {
    if (credentialsRequired) {
      return next(new Error('credentials_required'));
    } else {
      return next();
    }
  }

  let dtoken;

  try {
    dtoken = jwt.decode(token, { complete: true }) || {};
  } catch (err) {
    return next(new Error('invalid_token'));
  }

  switch(dtoken.payload.iss) {
    case C1_ETH_AUTH:
      try {
        verifyC1Token(token).then((decodedToken: any) => {
          req.user = decodedToken.user;
          console.log(`[JWT CHECK] Authenticated req.user: ${req.user}`);
          next();
        }).catch(() => {
          next();
        });
      } catch (err) {
        return next();
      }
      break;

    case `https://${process.env.AUTH0_DOMAIN}/`:
      try {
        verifyAuth0Token(token, dtoken.header.kid).then((decodedToken: any) => {
          req.user = decodedToken.sub;
          console.log(`[JWT CHECK] Authenticated req.user: ${req.user}`);
          next()
        });
      } catch (err) {
        return next(new Error('invalid_token'));
      }
      break;

    default: 
      return next(new Error('unexpected issuer'));
  }
};