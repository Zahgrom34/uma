> **UMA note (billz-v2, 03.09.2026):** the shop runs BILLZ 2 — this BILLZ 1 doc is historical; see `docs/reference/billz2-api-notes.md`.

?> ⚠️ Внимание. Это документация для BILLZ 1 app.billz.uz

?> ⚠️ Для BILLZ 2 (app.billz.io) документация находится по ссылке https://billzuz.notion.site/API-c2f91aa254f94f8eb7c1b26415dcb25b


# Аутентификация

BILLZ API использует JSON Web Token ([JWT](https://jwt.io/)) для проверки аутентификации.

JWT состоит из трех частей: header, payload и signature.

##### 1. Создаем HEADER

Header JWT содержит информацию о том, как должна вычисляться JWT подпись. Header — это тоже JSON объект, который выглядит следующим образом:

| Имя | Значение | Описание |
| :---| :--------| :--------|
| typ | JWT | Определяет что это JSON Web Token |
| alg | HS256 | Определяет алгоритм хеширования |

```json
{
    "typ": "JWT",
    "alg": "HS256"
}
```

##### 2. Создаем PAYLOAD

Payload — это полезные данные, которые хранятся внутри JWT. Payload должен хранить в себе следующие значения:

| Имя | Пример | Описание |
| :---| :--------| :--------|
| iss | example.com | Адрес сайта отправителя |
| iat | 1522402972 | Время создания токена в Unix Time |
| exp | 1522403092 | Срок действия токена в Unix Time |
| sub | demo.ecommerce | USERNAME пользователя в BILLZ в нижнем регистре (lowercase)|

?> USERNAME необходимо уточнять в комании BILLZ

```json
{
  "iss": "example.com",
  "iat": 1522402972,
  "exp": 1522403092,
  "sub": "demo.ecommerce"
}
```

##### 3. Создаем SIGNATURE

Подпись вычисляется с использование следующего кода:

```js
const SECRET_KEY = '!secret@Key#'
const unsignedToken = base64urlEncode(header) + '.' + base64urlEncode(payload)
const signature = HMAC-SHA256(unsignedToken, SECRET_KEY)
```

?> SECRET_KEY необходимо уточнять в комании BILLZ

##### 4. Объединяем все три компонента JWT вместе

```js
const token = encodeBase64Url(header) + '.' + encodeBase64Url(payload) + '.' + encodeBase64Url(signature)
// JWT Token
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJleGFtcGxlLmNvbSIsImlhdCI6MTUyMjQwMjk3MiwiZXhwIjoxNTIyNDAzMDkyLCJzdWIiOiJkZW1vLmVjb21tZXJjZSJ9.iosVDYNCrGOQyLCuzsr3br4gyLjwSJ-zBOWZp4wkUG0
```

#### Пример на NodeJs
```js
const secret = "jn..AS2";
var header = {
    "typ": "JWT",
    "alg": "HS256"
};
var payload = {
    "iss": "ecommerce-site.uz",
    "iat": 1638553677,
    "exp": 1738553677,
    "sub": "ecommerce.site"
};

var base64url = require("base64url")
const unsignedToken =
    base64url(JSON.stringify(header)) +
    "." +
    base64url(JSON.stringify(payload));
var crypto = require('crypto');
const signature = crypto.createHmac("sha256", secret)
    .update(unsignedToken)
    .digest();
const token = unsignedToken +
    "." +
    base64url(signature);
console.log(token);
```

#### Пример на Google Apps Script
```js
function createJwt2() {
    const header = Utilities.base64Encode(JSON.stringify({
        alg: 'HS256',
        typ: 'JWT'
    })).replace(/=+$/, "");
    
    const now = Date.now();
        let expires = new Date(now); expires.setMinutes(expires.getMinutes() + 5);
        const payload = Utilities.base64Encode(JSON.stringify({
            exp: Math.round(expires.getTime() / 1000),
            iat: Math.round(now / 1000),
            iss: "ecommerce.site",
            sub: "ecommerce.user"
            }))
            .replace(/=+$/, "");
        const secretKey = 'bVfpSjr...MY';
            const hexFromStr = Utilities.newBlob(secretKey)
            .getBytes()
            .map((byte) => ("0" + (byte & 0xff).toString(16)).slice(-2))
            .join("");
            
            const bytesFromHex = hexFromStr
            .match(/.{2}/g)
            .map((e) => 
            parseInt(e[0], 16).toString(2).length == 4
              ? parseInt(e, 16) - 256
              : parseInt(e, 16)
              );

            const toSign = Utilities.newBlob(`${header}.${payload}`).getBytes(); 
            const signatureBytes = Utilities.computeHmacSha256Signature(toSign, bytesFromHex); 
            const signature = Utilities.base64EncodeWebSafe(signatureBytes).replace(/=+$/, "");
        const jwt = `${header}.${payload}.${signature}`; 
        console.log({
            jwt
        });
        return jwt;
    };
```

#### Полный пример на PHP
```php
<?php
function base64_url_encode($input) {
    return trim(strtr(base64_encode($input), '+/', '-_'), '=');
}
$secret = "jn..AS2";

$headerArray = array(
    'typ'=> 'JWT',
    'alg'=> 'HS256'
);
$payloadArray = array(
  'iss'=> 'ecommerce-site.uz',
  'iat'=> 1638553677,
  'exp'=> 1738553677,
  'sub'=> 'ecommerce.site'
);

$header = base64_url_encode(json_encode($headerArray, JSON_FORCE_OBJECT));
$payload = base64_url_encode(json_encode($payloadArray, JSON_FORCE_OBJECT));

$unsignedToken = $header .'.'. $payload;

$signature = hash_hmac("sha256", $unsignedToken, $secret, true);
$encodedSignature = base64_url_encode($signature);
$token = $unsignedToken . '.' . $encodedSignature;
print($token);
```

##### 5. Сгенерированный JWT Token необходимо добавлять в запрос в качестве заголовка (Authorization: Bearer $token).

```http
POST https://api.billz.uz/v1/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJleGFtcGxlLmNvbSIsImlhdCI6MTUyMjQwMjk3MiwiZXhwIjoxNTIyNDAzMDkyLCJzdWIiOiJkZW1vLmVjb21tZXJjZSJ9.iosVDYNCrGOQyLCuzsr3br4gyLjwSJ-zBOWZp4wkUG0
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "method.name",
	"params": {
		"paramName_1": "paramValue_1",
		"paramName_2": "paramValue_2"
	},
	"id": "1"
}
```
