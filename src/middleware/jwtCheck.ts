import { C1_ETH_AUTH } from '../services/user/user.service';
import { NextFunction } from 'express';
import { isValidUser } from './userOkList';

var jwt = require('jsonwebtoken');
const fs = require('fs');

require('dotenv').config();

if (!process.env.PUBKEY_FILE) {
  throw new Error('process.env.PUBKEY_FILE undefined');
}

if (!process.env.JWT_SECRET) {
  throw new Error('process.env.JWT_SECRET undefined');
}

if (!process.env.AUTH0_DOMAIN) {
  throw new Error('process.env.AUTH0_DOMAIN undefined');
}

const publicKey = fs.readFileSync(process.env.PUBKEY_FILE);

export function verifyAuth0Token(token: string, kid: string) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      publicKey,
      {
        algorithms: ['RS256'],
      },
      (err: any, decodedToken: any) => {
        if (err || !decodedToken) {
          return reject(err);
        }
        resolve(decodedToken);
      }
    );
  });
}

export function verifyC1Token(token: string) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        algorithms: ['HS256'],
      },
      (err: any, decodedToken: any) => {
        if (err || !decodedToken) {
          return reject(err);
        }
        resolve(decodedToken);
      }
    );
  });
}

export const checkJwt = (req: any, res: any, next: NextFunction) => {
  let token;
  if (
    req.method === 'OPTIONS' &&
    req.headers.hasOwnProperty('access-control-request-headers')
  ) {
    var hasAuthInAccessControl = !!~req.headers[
      'access-control-request-headers'
    ]
      .split(',')
      .map(function (header: any) {
        return header.trim();
      })
      .indexOf('authorization');

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
        return next();
      }
    } else {
      return next(new Error('credentials_bad_format'));
    }
  }

  if (!token) {
    return next();
  }

  let dtoken;

  try {
    dtoken = jwt.decode(token, { complete: true }) || {};
  } catch (err) {
    return next(new Error('invalid_token'));
  }

  switch (dtoken.payload.iss) {
    case C1_ETH_AUTH:
      try {
        verifyC1Token(token)
          .then((decodedToken: any) => {
            req.user = isValidUser(decodedToken.user);
            console.log(`[JWT CHECK] Authenticated req.user: ${req.user}`);
            next();
          })
          .catch(() => {
            next();
          });
      } catch (err) {
        return next();
      }
      break;

    case `https://${process.env.AUTH0_DOMAIN}/`:
      try {
        verifyAuth0Token(token, dtoken.header.kid).then((decodedToken: any) => {
          req.user = isValidUser(decodedToken.sub);
          console.log(`[JWT CHECK] Authenticated req.user: ${req.user}`);
          next();
        });
      } catch (err) {
        return next(new Error('invalid_token'));
      }
      break;

    default:
      return next(new Error('unexpected issuer'));
  }
};
