> **UMA note (billz-v2, 03.09.2026):** the shop runs BILLZ 2 — this BILLZ 1 doc is historical; see `docs/reference/billz2-api-notes.md`.

?> ⚠️ Внимание. Это документация для BILLZ 1 app.billz.uz

?> ⚠️ Для BILLZ 2 (app.billz.io) документация находится по ссылке https://billzuz.notion.site/API-c2f91aa254f94f8eb7c1b26415dcb25b


# Методы
?> Для вызова метода необходимо отправлять запрос на https://api.billz.uz/v1/ в виде [JSON-RPC 2.0](http://www.jsonrpc.org/specification)

##### Пример запроса:
```http
POST https://api.billz.uz/v1/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
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

## products.get

?> Метод возвращает список продуктов. Если указать параметр `LastUpdatedDate` - метод вернет только те продукты, которые были изменены после даты `LastUpdatedDate`. Опциональный параметр `WithProductPhotoOnly` при значении `1` фильтрует товары только с фотографиями. Опциональный параметр `IncludeEmptyStocks` при значении `1` включает в список товарные наименования с нулевыми остатками.
⚠️ Внимание. Параметр `IncludeEmptyStocks` может вернуть очень большое кол-во строк. 


##### Параметры запроса

| Имя                  | Тип  | Описание                                                                  |
| :--------------------|:-----| :-------------------------------------------------------------------------|
| LastUpdatedDate      | time | Время последней синхронизации                                             |
| WithProductPhotoOnly | byte | Показывать товары только с фото. По умолчанию - выключено 0               |
| FullSizePhoto        | byte | Если указано 1 и включен WithProductPhotoOnly, то приедет список ссылок на полноразмерные картинки товара. По умолчанию - выключено 0  - отдает превью|
| IncludeEmptyStocks   | byte | Включить в список товары с нулевыми остатками. По умолчанию - выключено 0 |
| ProductIds   | string | Фильтр списка ID  продуктов, через  запятую|
| offices   | []int | Фильтр списка ID  магазинов, массивом|


##### Пример запроса

```httpЫ
POST https://api.billz.uz/v1/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "products.get",
	"params": {
		"LastUpdatedDate": "2018-03-21T18:19:25Z",
		"WithProductPhotoOnly":0,
		"IncludeEmptyStocks":0,
		"ProductIds":"12083,47392,23828",
		"offices":[12,23,34]
	},
	"id": "1"
}
```

##### Параметры ответа

| Имя             | Тип  | Описание                      |
| :---------------|:-----| :-----------------------------|
| ID | int | ID продукта |
| name | string | Название |
| sku | string | Артикул |
| barCode | string | Баркод |
| price | float | Цена в сумах|
| priceUSD | float | Цена в доллара США |
| discountAmount | float | Сумма скидки в сумах |
| qty | float | Кол-во |
| properties | object | Атрибуты |
| offices | array | Список магазинов |
| imageUrls | array | Список ссылок на картинки проудкта |

?> Ссылку на оригинальное изображение можно получить, убрав суффикс "_square" из имени файла. Или включив параметр FullSizePhoto=1

##### Пример ответа

```json
{
	"id": "1",
	"jsonrpc": "2.0",
	"result": [
		{
			"id": 22341,
			"name": "Рубашка",
			"sku": "lan.192",
			"barCode": "3381000332000",
			"price": 599000,
			"priceUSD": 12.048193,
      "discountAmount": 15000,
      "qty": 192,
			"properties": {
				"BRAND": "Lanvin",
				"CATEGORY": "Рубашки",
				"COLLECTION": "SS18",
				"COLOR": "Черный",
				"DESCRIPTION": "Хлопок",
				"GENDER": "M",
				"SEASON": "SS18",
				"SIZE": "XL",
				"SUB_CATEGORY": "Классика"
			},
			"offices": [
				{
					"officeID": 3211,
					"officeName": "Demo Store 1",
					"price": 599000,
					"priceUSD": 12.048193,
          "discountAmount": 15000,
					"qty": 192
				}
				...
			],
			"imageUrls": [
					{
							"url": "https://app.billz.uz/fileupload/products/582105/4C1626127371552956092D46C23D14CE_041119195729_square.jpeg"
					},
					{
							"url": "https://app.billz.uz/fileupload/products/582105/CFDE90C565F7FB16037CDC0C81BE2490_041519142515_square.jpeg"
					}
			]
		}
		...
    ]
}
```

## orders.create

?> Метод позволяет создавать продажу.

##### Параметры запроса для версии v1
```http
POST https://api.billz.uz/v1/ HTTP/1.1
```

| Имя             | Тип  | Описание                      |
| :---------------|:-----| :-----------------------------|
| ID | int | ID заказа в eCommerce |
| dateCreated | time | Время создания заказа в eCommerce |
| datePaid | time | Время оплаты заказа в eCommerce |
| paymentMethod | string | Метод оплаты |
| subTotalPrice | float | Цена заказа |
| discountAmount | float | Цена скидки |
| totalPrice | float | Итоговая цена |
| products | array | Список продуктов |
| parked | bool | Создавать ли продажу как отложку. По умолчанию = false (нет, создавать как обычную продажу) |

Параметр *paymentMethod* может принимать один из следующих стороквых значений

| Значение        |Коментарий           |
| :---------------|:--------------------|
| 		"Cash"  | значение по умолчанию|
| 		"UZCard"| |
| 		"clickuz"| Не использовать! преобразуется в UZCard, оставлено для совместимости |
| 		"payme"| Не использовать! преобразуется в UZCard, оставлено для совместимости|
|     "cashbackBalance"| Используется только для оплаты кешбеком клиента|
| 		"VISA"| |
| 		"Click" ||
| 		"Payme"| |
| 		"Humo"| |
| 		"Paypal"| |
| 		"Apelsin"| |

##### Параметры запроса для версии v3
```http
POST https://api.billz.uz/v3/ HTTP/1.1
```

| Имя             | Тип  | Описание                      |
| :---------------|:-----| :-----------------------------|
| ID | int | ID заказа в eCommerce |
| dateCreated | time | Время создания заказа в eCommerce |
| datePaid | time | Время оплаты заказа в eCommerce |
| paymentMethod | string | Метод оплаты |
| subTotalPrice | float | Цена заказа |
| discountAmount | float | Цена скидки |
| totalPrice | float | Итоговая цена |
| products | array | Список продуктов |
| parked | bool | Создавать ли продажу как отложку. По умолчанию = false (нет, создавать как обычную продажу) |
| clientID | int | Привязывает продажу к клиенту. Если указан тип оплаты *cashbackBalance*, то clientID указывать обязательно |

##### Пример запроса

```http
POST https://api.billz.uz/v1/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "orders.create",
	"params": {
		"orderID": 45,
		"dateCreated": "2018-03-27T09:19:25.667Z",
		"datePaid": "2018-03-27T09:19:25.667Z",
		"paymentMethod": "Cash",
		"subTotalPrice": 45990,
		"discountAmount": 3000,
		"totalPrice": 42990,
    "parked": true,
    "clientID": 12345,
		"products": [
			{
				"billzOfficeID": 70,
				"billzProductID": 61623,
				"productID": 22341,
				"name": "Рубашка",
                "sku": "lan.192",
                "barCode": "3381000332000",
				"qty": 1,
				"subTotalPrice": 45990,
				"discountAmount": 45990,
				"totalPrice": 45990
			}
			...
		]
	}
}
```

##### Параметры ответа

| Имя             | Тип  | Описание                      |
| :---------------|:-----| :-----------------------------|
|  | array | Список ID совершенных транзакций в BILLZ |


##### Пример ответа

```json
{
	"id": "1",
	"jsonrpc": "2.0",
	"result": [
		36829
	]
}
```

## catalog.get

?> Метод возвращает Каталог продуктов.

##### Параметры запроса

| Имя                  | Тип  | Описание                                                                  |
| :--------------------|:-----| :-------------------------------------------------------------------------|
| PerPage      | int32 | Количество элементов на страницу                                                 |
| Page      | int32 | Номер страницы                                                 |
| SearchString      | string | Строка поиска                                                 |
| Filter.Statuses      | []string | Фильтрация по Статусам                                                |
| Filter.Offices      | []string | Фильтрация по магазинам                                                 |
| Filter.OfficeIds      | []int32 | Фильтрация по ID магазинам                                                    |
| Filter.Names      | []string | Фильтрация по наименованиями                                           |
| Filter.VendorCodes      | []string | Фильтрация по артикулам                                             |
| Filter.BarCodes      | []string | Фильтрация по баркодам                                           |
| Price.Type      | int32 | Тип цены                                               |
| Price.Currency      | int32 | Валюта                                                |
| Price.From      | int32 | Цена от                                                 |
| Price.To      | int32 | Цена до                                                 |



##### Пример запроса

```http
POST https://api.billz.uz/v2/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "catalog.get",
	"params": {
		"PerPage": 2,
    "Page": 1,
		"Sort": {
        "type": "num",
        "field": "id",
        "order": "desc"
    }
	},
	"id": "1200"
}
```

##### Параметры ответа

| Имя             | Тип  | Описание                      |
| :---------------|:-----| :-----------------------------|
| total                  |  int64 | Общее кол-во строк в ответе|
| page                  |  int | Текущая страница|
| data.results 												 | []object| список продуктов |   
| data.results[].id 						 | int | ID товара |
| data.results[].name 											 | string | Название продукта |
| data.results[].vendorCode 								 | string | Артикул |
| data.results[].vendorImage								 | string | Ссылка на главное изображение продукта |
| data.results[].barCode 								   | string | Баркод |
| data.results[].officeId | int | ID магазина |
| data.results[].officeName             | string | Наименование магазина |
| data.results[].parentOfficeId | int | ID родительской точки |
| data.results[].properties.*.value								 | string| Значение свойства продукта |
| data.results[].properties.*.captionRu								 | string| Наименование свойства продукта на русском|
| data.results[].properties.*.captionEn								 | string| Наименование свойства продукта на русском|
| data.results[].counts.Active 									 | int | Общее количество активных товара в магазине|
| data.results[].counts.WrittenOff 									 | int | Общее количество списанных товара в магазине|
| data.results[].counts.sold 									 | int | Общее количество проданных товара в магазине|
| data.results[].prices.sumActiveRetailPriceUzs								 | float| Сумма активных товаров по цене продажи в сумах|
| data.results[].prices.sumActiveSupplyPriceUsd								 | float| Сумма активных товаров по цене продажи в долларах|
| data.results[].prices.sumActiveSupplyPriceUzs								 | float| Сумма активных товаров по цене поставки в сумах|
| data.results[].prices.sumActiveRetailPriceUsd								 | float| Сумма активных товаров по цене поставки в долларах|
| data.results[].prices.supplyPriceUzs								 | float| Цена поставки товара в сумах|
| data.results[].prices.supplyPriceUsd								 | float| Цена поставки товара в долларах|
| data.results[].prices.retailPriceUzs								 | float| Цена продажи товара в сумах|
| data.results[].prices.retailPriceUsd								 | float| Цена продажи товара в долларах|
| data.results[].aggregations.sumInActive								 | int| Количество неактивных товаров |
| data.results[].aggregations.sumActive								 | int| Количество активных товаров |
| data.results[].aggregations.sumAll								 | int| Количество всех товаров |
| data.results[].aggregations.sumSmallBalance								 | int| Количество товаров с малым остатком|
| data.results[].aggregations.sumZeroBalance								 | int| Количество товаров с нулевым остатком |
| data.results[].aggregations.cardinality								 | int| Количество наименований |
| data.results[].aggregations.sumRetailPriceUzs								 | float| Сумма по цене продажи в сумах |
| data.results[].aggregations.sumRetailPriceUsd								 | float| Сумма по цене продажи в долларах|

##### Пример ответа

```json
{
  "id": "1200",
  "jsonrpc": "2.0",
  "result": {
    "apiVersion": "develop:0a4f2de",
    "data": {
      "isValid": true,
      "total": 10480,
      "page": 1,
      "aggregations": {
        "sumInActive": 56810,
        "sumActive": 54829,
        "sumSmallBalance": 8124,
        "sumAll": 111639,
        "sumRetailPriceUzs": 1.0071281e+10,
        "sumZeroBalance": 1870,
        "cardinality": 10161
      },
      "results": [
        {
          "id": 1348883,
          "name": "aaaaaSnickers",
          "vendorCode": "5555555550",
          "barCode": "5555555550",
          "parentOfficeId": 5,
          "officeId": 6,
          "officeName": "Demo Brand",
          "prices": {
            "retailPriceUzs": 25000,
            "supplyPriceUzs": 10000,
            "retailPriceUsd": 2.5,
            "supplyPriceUsd": 1
          },
          "counts": {
            "sAll": 1001
          },
          "properties": {
            "modelName": {
              "value": "Supreer",
              "captionRu": "Модель",
              "captionEn": "Model"
            },
            "material": {
              "value": "Cotton",
              "captionRu": "Материал",
              "captionEn": "Material"
            },
            "colorCode": {
              "value": "Black",
              "captionRu": "Код цвета",
              "captionEn": "Color Code"
            }
          }
        },
        {
          "id": 1348883,
          "name": "aaaaaSnickers",
          "vendorCode": "5555555550",
          "barCode": "5555555550",
          "parentOfficeId": 5,
          "officeId": 7,
          "officeName": "Demo Store SD",
          "prices": {
            "sumActiveRetailPriceUzs": 2.5025e+07,
            "sumActiveSupplyPriceUsd": 1001,
            "retailPriceUzs": 25000,
            "supplyPriceUzs": 10000,
            "sumActiveSupplyPriceUzs": 1.001e+07,
            "sumActiveRetailPriceUsd": 2502.5,
            "retailPriceUsd": 2.5,
            "supplyPriceUsd": 1
          },
          "counts": {
            "sActive": 1001,
            "active": 1001,
            "sAll": 1001
          },
          "properties": {
            "modelName": {
              "value": "Supreer",
              "captionRu": "Модель",
              "captionEn": "Model"
            },
            "material": {
              "value": "Cotton",
              "captionRu": "Материал",
              "captionEn": "Material"
            },
            "colorCode": {
              "value": "Black",
              "captionRu": "Код цвета",
              "captionEn": "Color Code"
            }
          }
        }
      ]
    }
  }
}
```




## client.get

?> Получить информацию о клиенте. Метод возвращает данные о клиените, группах, карточка, балансе, покупках, товарах и платежах

##### Параметры запроса

| Имя           | Тип    | Описание                                                                  |
| :-------------|:-------| :-------------------------------------------------------------------------|
| ClientID            | int64 | ID клиента      |
| BeginDate            | time.Time | начало периода покупок клиента      |
| EndDate            | time.Time | окончение периода покупок клиента      |
| LastUpdateDate            | time.Time | дата с которой были изменения по клиенту      |

##### Пример запроса

```http
POST https://api.billz.uz/v1/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "client.get",
	"params": {
		"clientId":116673,
		"beginDate":"2021-05-01T18:19:25Z",
		"endDate":"2021-05-20T18:19:25Z"
		"lastUpdateDate":"2021-05-01T18:19:25Z"
	},
	"id": "1"
}
```

##### Параметры ответа

| Имя                | Тип  | Описание                      |
| :------------------|:-----| :-----------------------------|
| 	Client.ID                   	| 	int64           	| 	ID Клиента	| 
| 	Client.PrimaryClientID      	| 	int64           	| 	Родительская запись	| 
| 	Client.OfficeID             	| 	int64           	| 	ID магазина	| 
| 	Client.OfficeName           	| 	string          	| 	Магазин	| 
| 	Client.InsDate              	| 	time.Time       	| 	Дата попадания записи	| 
| 	Client.FirstName            	| 	string          	| 	Имя клиента	| 
| 	Client.LastName             	| 	string          	| 	Фамилия клиента	| 
| 	Client.MiddleName           	| 	string          	| 	Отчество клиента	| 
| 	Client.LangID               	| 	sql.NullInt64   	| 	ID языка	| 
| 	Client.LangName             	| 	string          	| 	Язык	| 
| 	Client.Gender               	| 	sql.NullInt64   	| 	ID пола клиента	| 
| 	Client.GenderName           	| 	string          	| 	пол клиента	| 
| 	Client.MaritalStatus        	| 	sql.NullInt64   	| 	ID семейного положения клиента	| 
| 	Client.MaritalStatusName    	| 	string          	| 	Cемейное положение клиента	| 
| 	Client.FamilyRole           	| 	sql.NullInt64   	| 	Член семьи	| 
| 	Client.FamilyRoleName       	| 	string          	| 	Член семьи	| 
| 	Client.BirthDate            	| 	time.Time       	| 	Дата рождения	| 
| 	Client.PrimaryEmail         	| 	string          	| 	email клиента	| 
| 	Client.AllowEmail           	| 	sql.NullInt64   	| 	Клиент разрешает получать сообщения на email	| 
| 	Client.AllowCall            	| 	sql.NullInt64   	| 	Клиент разрешает получать звонки	| 
| 	Client.AllowSms             	| 	sql.NullInt64   	| 	Клиент разрешает получать сообщения по SMS	| 
| 	Client.AllowIm              	| 	sql.NullInt64   	| 	Клиент разрешает получать сообщения на телеграм или другой IM	| 
| 	Client.PurchaseNum          	| 	string          	| 	Общее кол-во покупок	| 
| 	Client.PurchaseSumUzs       	| 	string          	| 	Общее кол-во покупок на сумму в сумах	| 
| 	Client.PurchaseSumUsd       	| 	sql.NullFloat64 	| 	Общее кол-во покупок на сумму в долларах	| 
| 	Client.AllPurchaseSumUzs    	| 	string          	| 	Общее кол-во покупок в сети на сумму в сумах	| 
| 	Client.AllPurchaseSumUsd    	| 	sql.NullFloat64 	| 	Общее кол-во покупок в сети на сумму в долларах	| 
| 	Client.FirstTransactionDate 	| 	time.Time       	| 	дата первой покупки	| 
| 	Client.LastTransactionDate  	| 	time.Time       	| 	дата последней покупки	| 
| 	Client.LastTransactionID    	| 	int64           	| 	ID последней покупки	| 
| 	Client.LastUpdateDate       	| 	time.Time       	| 	датиа последнего обнолвения клиента 	| 
| 	Client.CardNumbers          	| 	string          	| 	карты клиента	| 
| 	Client.Balance              	| 	sql.NullFloat64 	| 	баланс клиента	| 
| 	Client.CardHash             	| 	string          	| 	хеш карточким	| 
| 	Client.CompanyName          	| 	string          	| 	не используется	| 
| 	Client.Description          	| 	string          	| 	Описание клиента	| 
| 	ClientGroupTags[].ID               	| 	int64  	| 	внутренний ID	| 
| 	ClientGroupTags[].ClientID         	| 	int64  	| 	ID клиента	| 
| 	ClientGroupTags[].ClientGroupTagID 	| 	int64  	| 	ID тега или группы	| 
| 	ClientGroupTags[].TagType          	| 	int64  	| 	Тег или группа	| 
| 	ClientGroupTags[].TagTypeName      	| 	string 	| 	Тип тега или группы	| 
| 	ClientGroupTags[].TagName          	| 	string 	| 	Имя тега или группы	| 
| 	ClientCards[].ID           	| 	int64     	| 	ID 	| 
| 	ClientCards[].ClientID     	| 	int64     	| 	ID 	| 
| 	ClientCards[].State        	| 	int64     	| 	не используется	| 
| 	ClientCards[].InsDate      	| 	time.Time 	| 	Дата попадания записи	| 
| 	ClientCards[].CardNumber   	| 	string    	| 	код карты	| 
| 	ClientCards[].CardHash     	| 	string    	| 	хеш кода	| 
| 	ClientCards[].CardType     	| 	int64     	| 	тип карты	| 
| 	ClientCards[].ActivateDate 	| 	time.Time 	| 	дата активации	| 
| 	ClientCards[].LastUseDate  	| 	time.Time 	| 	последнее использование	| 
| 	ClientCards[].ExpireDate   	| 	time.Time 	| 	срок действия	| 
| 	ClientCards[].Name         	| 	string    	| 	имя карты	| 
| 	ClientBalances[].ID              	| 	int64           	| 	ID баланса	| 
| 	ClientBalances[].ClientID        	| 	int64           	| 	ID клиента	| 
| 	ClientBalances[].State           	| 	int64           	| 	не используется	| 
| 	ClientBalances[].InsDate         	| 	time.Time       	| 	Дата попадания записи	| 
| 	ClientBalances[].BalanceType     	| 	int64           	| 	ID типа баланса	| 
| 	ClientBalances[].BalanceTypeName 	| 	string          	| 	тип баланса	| 
| 	ClientBalances[].BalanceValue    	| 	sql.NullFloat64 	| 	баланс	| 
| 	ClientBalances[].ExpireDate      	| 	time.Time       	| 	срок действия	| 
| 	Transactions[].ID               	| 	int64           	| 	ID продажи	| 
| 	Transactions[].State            	| 	int64           	| 	не используется	| 
| 	Transactions[].SaleDate         	| 	time.Time       	| 	Дата продажи	| 
| 	Transactions[].SalePriceUZS     	| 	sql.NullFloat64 	| 	сумма продажи в сумах	| 
| 	Transactions[].SalePriceUSD     	| 	sql.NullFloat64 	| 	сумма продажи в долларах	| 
| 	Transactions[].ReturnPriceUZS   	| 	sql.NullFloat64 	| 	сумма возврата в сумах	| 
| 	Transactions[].ReturnPriceUSD   	| 	sql.NullFloat64 	| 	сумма возврата в долларах	| 
| 	Transactions[].Products         	| 	sql.NullInt64   	| 	количество продуктов в продаже	| 
| 	Transactions[].ReturnedProducts 	| 	string          	| 	не используется	| 
| 	TransactionDetails[].TransactionID   	| 	int64           	| 	ID продажи 	| 
| 	TransactionDetails[].ID              	| 	int64           	| 	ID продукта	| 
| 	TransactionDetails[].ParentDetailID  	| 	sql.NullInt64   	| 	ID родительской записи	| 
| 	TransactionDetails[].OfficeID        	| 	int64           	| 	ID магазина	| 
| 	TransactionDetails[].State           	| 	int64           	| 	не используется	| 
| 	TransactionDetails[].ProductID       	| 	int64           	| 	ID продукта	| 
| 	TransactionDetails[].Quantity        	| 	int64           	| 	количество	| 
| 	TransactionDetails[].ExchangeID      	| 	sql.NullInt64   	| 	ID продажи обмена	| 
| 	TransactionDetails[].SellerID        	| 	int64           	| 	ID продавца	| 
| 	TransactionDetails[].SellerName      	| 	string          	| 	Имя продавца	| 
| 	TransactionDetails[].RetailPriceUZS  	| 	sql.NullFloat64 	| 	Цена продажи в Сумах	| 
| 	TransactionDetails[].RetailPriceUSD  	| 	sql.NullFloat64 	| 	Цена продажи в Доллларах	| 
| 	TransactionDetails[].SalePriceUZS    	| 	sql.NullFloat64 	| 	Фактическая цена продажи в Сумах	| 
| 	TransactionDetails[].SalePriceUSD    	| 	sql.NullFloat64 	| 	Фактическая цена продажи в Доллларах	| 
| 	TransactionDetails[].RoundedPriceUZS 	| 	sql.NullFloat64 	| 	Округления в сумах	| 
| 	TransactionDetails[].RoundedPriceUSD 	| 	sql.NullFloat64 	| 	Округления в долларах	| 
| 	TransactionDetails[].HaveDiscount    	| 	int64           	| 	Есть ли скидка на товар	| 
| 	TransactionDetails[].Name            	| 	string          	| 	Наименование товара	| 
| 	TransactionDetails[].VendorCode      	| 	string          	| 	Артикул	| 
| 	TransactionDetails[].BarCode         	| 	string          	| 	Баркод	| 
| 	TransactionDetails[].Category        	| 	string          	| 	Категория	| 
| 	TransactionDetails[].SubCategory     	| 	string          	| 	Подкатегория	| 
| 	TransactionDetails[].Color           	| 	string          	| 	Цвет	| 
| 	TransactionDetails[].Brand           	| 	string          	| 	Бренд	| 
| 	TransactionDetails[].Season          	| 	string          	| 	Размер	| 
| 	TransactionDetails[].BatchCode       	| 	string          	| 	номер партии	| 
| 	TransactionDetails[].ExpDate         	| 	string          	| 	срок действия	| 
| 	TransactionDetails[].BarcodeOrg      	| 	string          	| 	оригинальный баркод	| 
| 	TransactionDetails[].Size            	| 	string          	| 	Рзамер	| 
| 	TransactionPayments[].ID            	| 	int64           	| 	ID платежа 	| 
| 	TransactionPayments[].TransactionID 	| 	int64           	| 	ID продажи 	| 
| 	TransactionPayments[].PaymentType   	| 	int64           	| 	Тип платежа	| 
| 	TransactionPayments[].IconClass     	| 	string          	| 	не используется	| 
| 	TransactionPayments[].Amount        	| 	float64         	| 	Сумма платежа	| 
| 	TransactionPayments[].BalanceID     	| 	sql.NullInt64   	| 	ID  баланса, если есть	| 
| 	TransactionPayments[].PayedSum      	| 	sql.NullFloat64 	| 	не используется	| 
| 	TransactionPayments[].CertID        	| 	sql.NullInt64   	| 	ID 	| 
| 	TransactionPayments[].CertPrice     	| 	string          	| 	сумма оплаченная сертификатом	| 
| 	TransactionPayments[].CertTransID   	| 	sql.NullInt64   	| 	не используется	| 
| 	TransactionPayments[].PaymentTypeID 	| 	string          	| 	ID типа платежа	| 
| 	TransactionPayments[].InsDate       	| 	time.Time       	| 	Дата попадания записи	| 

##### Пример ответа

```json
{
  "id": "1",
  "jsonrpc": "2.0",
  "result": {
    "client": {
      "id": 116673,
      "officeName": "Demo Brand",
      "insDate": "2017-08-12T12:32:17+05:00",
      "firstName": "Супермен",
      "lastName": "Батманович",
      "genderName": "Женщина",
      "birthDate": "2017-08-12T00:00:00+05:00",
      "purchaseNum": "4",
      "purchaseSumUzs": "885050",
      "all_purchase_sum_uzs": "0",
      "firstTransactionDate": "2017-08-12T12:33:36+05:00",
      "lastTransactionDate": "2017-11-29T23:15:25+05:00",
      "lastTransactionId": 10216,
      "cardNumbers": "1321412",
      "balance": {
        "Float64": 0,
        "Valid": false
      },
      "CardHash": "",
      "CompanyName": "",
      "Description": ""
    },
    "clientGroupTags": [
      {
        "id": 81108,
        "clientId": 116673,
        "clientGroupTagId": 73,
        "tagTypeName": "Группа",
        "tagName": "Скидка 20%"
      },
      {
        "id": 296492,
        "clientId": 116673,
        "clientGroupTagId": 288,
        "tagTypeName": "Группа",
        "tagName": "Стат"
      }
    ],
    "clientCard": [
      {
        "id": 41360,
        "clientId": 116673,
        "state": 1,
        "insDate": "2019-08-21T17:53:24+05:00",
        "cardNumber": "wqjhofheogwefiuwehguowehgiuefew",
        "cardHash": "51e7057eda2b0c6d254462752e2cdb90",
        "activateDate": "0001-01-01T00:00:00Z",
        "lastUseDate": "0001-01-01T00:00:00Z",
        "expireDate": "0001-01-01T00:00:00+05:00",
        "name": "1321412"
      }
    ],
    "transactions": [
      {
        "id": 73700,
        "state": 2,
        "saleDate": "2018-08-07T16:08:14+05:00",
        "salePriceUZS": {
          "Float64": 98000,
          "Valid": true
        },
        "returnPriceUZS": {
          "Float64": 0,
          "Valid": true
        },
        "products": {
          "Int64": 3,
          "Valid": true
        },
        "returnedProducts": "-1"
      }
    ],
    "transactionDetails": [
      {
        "transactionId": 73700,
        "id": 271687,
        "parentDetailId": {
          "Int64": 0,
          "Valid": false
        },
        "productId": 95380,
        "quantity": 1,
        "exchangeId": {
          "Int64": 0,
          "Valid": false
        },
        "sellerId": 42,
        "sellerName": "Супермен Батманович",
        "retailPriceUZS": {
          "Float64": 650000,
          "Valid": true
        },
        "salePriceUZS": {
          "Float64": 499000,
          "Valid": true
        },
        "roundedPriceUZS": {
          "Float64": 499000,
          "Valid": true
        },
        "haveDiscount": 1,
        "name": "Майка Cool",
        "vendorCode": "100002",
        "barCode": "4780000000002",
        "category": "Майка",
        "subCategory": "Cool collection",
        "color": "Белый",
        "brand": "Nike",
        "season": "SS18",
        "batchCode": "111",
        "size": "M"
      },
      {
        "transactionId": 73700,
        "id": 271688,
        "parentDetailId": {
          "Int64": 0,
          "Valid": false
        },
        "productId": 95381,
        "quantity": 1,
        "exchangeId": {
          "Int64": 0,
          "Valid": false
        },
        "sellerId": 42,
        "sellerName": "Супермен Батманович",
        "retailPriceUZS": {
          "Float64": 299000,
          "Valid": true
        },
        "salePriceUZS": {
          "Float64": 299000,
          "Valid": true
        },
        "roundedPriceUZS": {
          "Float64": 299000,
          "Valid": true
        },
        "name": "Просто майка",
        "vendorCode": "100003",
        "barCode": "4780000000003",
        "category": "Майка тестовая",
        "subCategory": "Спорт",
        "color": "Красный",
        "brand": "Reebok",
        "season": "SS18",
        "size": "L"
      },
      {
        "transactionId": 73700,
        "id": 271689,
        "parentDetailId": {
          "Int64": 271686,
          "Valid": true
        },
        "productId": 95379,
        "quantity": 1,
        "exchangeId": {
          "Int64": 0,
          "Valid": false
        },
        "sellerId": 42,
        "sellerName": "Супермен Батманович",
        "retailPriceUZS": {
          "Float64": 700000,
          "Valid": true
        },
        "salePriceUZS": {
          "Float64": 700000,
          "Valid": true
        },
        "roundedPriceUZS": {
          "Float64": 700000,
          "Valid": true
        },
        "name": "Костюм Classic1",
        "vendorCode": "100001",
        "barCode": "478000000000.1",
        "category": "Test change category",
        "subCategory": "Классика",
        "color": "Черный",
        "brand": "Nike",
        "season": "SS18",
        "size": "S"
      }
    ],
    "transactionPayments": [
      {
        "id": 45639,
        "transactionId": 73700,
        "amount": 98000,
        "balanceId": {
          "Int64": 0,
          "Valid": false
        },
        "payedSum": {
          "Float64": 0,
          "Valid": false
        },
        "certID": {
          "Int64": 0,
          "Valid": false
        },
        "certTransID": {
          "Int64": 0,
          "Valid": false
        },
        "paymentTypeID": "Наличные"
      }
    ]
  }
}
```

## client.search

?> Поиск клиентов по номеру телефону или по email. Параметры PhoneNumber и Email взаимоисключаемые. Если указаны оба, то поиск осуществляется только по PhoneNumber. Метод возвращает список объектов по каждому найденному клиенту из запроса client.get

##### Параметры запроса

| Имя           | Тип    | Описание                                                                  |
| :-------------|:-------| :-------------------------------------------------------------------------|
| PhoneNumber            | string | номер телефона покупателя  |
| Email            | string | email покупателя     |
| BeginDate            | time.Time | начало периода покупок клиента      |
| EndDate            | time.Time | окончение периода покупок клиента      |
| LastUpdateDate            | time.Time | дата с которой были изменения по клиенту      |

##### Пример запроса

```http
POST https://api.billz.uz/v1/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "client.search",
	"params": {
		"phoneNumber":'998931830011',
		"beginDate":"2021-05-01T18:19:25Z",
		"endDate":"2021-05-20T18:19:25Z"
		"lastUpdateDate":"2021-05-01T18:19:25Z"
	},
	"id": "1"
}
```
##### Параметры ответа

| Имя                | Тип  | Описание                      |
| :------------------|:-----| :-----------------------------|
| 	Client                   	| 	[]Client           	| 	Массив с найденными клиентами	| 

##### Пример ответа

```json
{
  "id": "1",
  "jsonrpc": "2.0",
  "result": {
    "clients": [
      {
        "client": {},
      },
      {
        "client": {},
      },{
        "client": {},
      }
    ]
  }
}
```

## reports.sales

?> Отчет "Продажи". Возвращает список покупок, совершенных за указанный период

##### Параметры запроса

| Имя                  | Тип  | Описание                                                                  |
| :--------------------|:-----| :-------------------------------------------------------------------------|
| dateBegin     | time   | Дата начала периода                                             |
| dateEnd       | time   | Дата окончания периода                                             |
| currency      | string | Код валюты (UZS или USD), в которой нужно вернуть денежные значения отчета                                      |


##### Пример запроса

```http
POST https://api.billz.uz/v1/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "reports.sales",
	"params": {
		"dateBegin": "2020-10-01T00:00:00Z",
		"dateEnd": "2020-10-02T00:00:00Z",
		"currency": "UZS"
	},
	"id": "1200"
}
```

##### Параметры ответа

| Имя             | Тип  | Описание                      |
| :---------------|:-----| :-----------------------------|
| saleDate           | string         | Дата продажи|
| product            | string         | Наименование продукта|
| vendorCode         | string         | Артикул|
| barCode            | string         | Баркод |
| office             | string         | Наименование магазина  |
| officeID           | int64          | ID магазина |
| clientFullName     | string         | Полное имя клиента, кому была сделана продажа |
| sellerFullName     | string         | Полное имя продавца |
| sold               | int64          | Кол-во проданных продуктов |
| soldMinusReturns   | int64          | Продано за вычетом возвратов|
| retailPrice        | float64        | Продажи без учета скидки |
| salePrice          | float64        | Продажи с учетом скидки |
| netRevenue         | float64        | Продажи за вычетом возвратов |
| netProfit          | float64        | Чистая прибыль |
| purchasePriceSales | float64        | Продажи по цене закупки |
| avgMargin          | float64        | Средняя маржа |
| importQty          | int64          | Не используется |
| importRetailPrice  | float64        | Не используется |
| importSupplyPrice  | float64        | Не используется |
| discount           | float64        | Скидка, % |
| returned           | int64          | Возварты |
| returnSalePrice    | float64        | Возвращено на сумму |
| additional		     | JSON key-value | Свойства |


##### Пример ответа

```json
{
  "id": "1200",
  "jsonrpc": "2.0",
  "result": {
    "dateBegin": "2020-10-01T00:00:00Z",
    "dateEnd": "2020-10-02T00:00:00Z",
    "report": [
      {
        
        "saleDate": "2020.10.02",
        "product": "New Product",
        "vendorCode": "929292",
        "barCode": "2000000175225",
        "office": "Demo Store Next",
        "officeID": 8,
        "clientFullName": "Marat Bozorin",
        "sellerFullname": "Oleg Belov",
        "sold": 5,
        "soldMinusReturns": 5,
        "retailPrice": 50000000.0,
        "salePrice": 25000000.0,
        "netRevenue": 25000000.0,
        "netProfit": -1000000.0,
        "purchasePriceSales": 26000000.0,
        "avgMargin": 0.96,
        "discount": 50.0,
        "additional": {
          "BRAND": "null",
          "CATEGORY": "test",
          "COLLECTION": "Зима-20",
          "COLOR": "01",
          "ПОСТАВЩИК": null
        },
      }
    ]
  }
}
```

## reports.transfers

?> Отчет "Трансферы". Возвращает список продуктов, перемещенных за указанный период

##### Параметры запроса

| Имя           | Тип    | Описание                                                                  |
| :-------------|:-------| :-------------------------------------------------------------------------|
| dateBegin     | time   | Дата начала периода                                             |
| dateEnd       | time   | Дата окончания периода                                             |
| currency      | string | Код валюты (UZS или USD), в которой нужно вернуть денежные значения отчета                                      |


##### Пример запроса

```http
POST https://api.billz.uz/v1/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "reports.transfers",
	"params": {
		"dateBegin": "2020-10-01T00:00:00Z",
		"dateEnd": "2020-10-02T00:00:00Z",
		"currency": "UZS"
	},
	"id": "1200"
}
```

##### Параметры ответа

| Имя                | Тип  | Описание                      |
| :------------------|:-----| :-----------------------------|
| insDate         | string        | Дата импорта товарв |
| productName     | string        | Наименование продукта|
| barCode         | string        | Баркод |
| vendorCode      | string        | Артикул |
| transferID      | int64         | ID Перемещения в системе BILLZ |
| officeSource    | string        | Наименование магазина отправителя |
| officeSourceID  | int64         | ID магазина отправителя |`
| officeTarget    | string        | Наименование магазина получателя |
| officeTargetID  | int64         | ID магазина получателя |`
| quantity        | int64         | Кол-во товаров |
| retailPrice     | float64       | Сумма товаров по цене продажи |
| supplyPrice     | float64       | Сумма товаров по цене поставки|
| additional			| JSON key-value | Свойства |


##### Пример ответа

```json
{
  "id": "1200",
  "jsonrpc": "2.0",
  "result": {
    "dateBegin": "2020-10-03T00:00:00Z",
    "dateEnd": "2020-10-04T00:00:00Z",
    "report": [
      {
        "insDate": "2020.10.03",
        "productName": "Капри",
        "barCode": "4680007210907",
        "vendorCode": "34234234",
        "transferID": 5123273,
        "officeSource": "Demo Store SD",
        "officeSourceID": 7,
        "officeTarget": "Demo Store Next",
        "officeTargetID": 8,
        "quantity": 1,
        "retailPrice": 210500,
        "supplyPrice": 113300,
        "additional": {
          "BRAND": "null",
          "CATEGORY": "test",
          "COLLECTION": "Зима-20",
          "COLOR": "01",
          "ПОСТАВЩИК": null
        },
      }
    ]
  }
}
```

## reports.transfers V2

?> Отчет "Трансферы". Возвращает список продуктов, перемещенных за указанный период c указанием даты и времени, а так же ID продуктов. Запрос выполянется на endpoint /v2

##### Параметры запроса

| Имя           | Тип    | Описание                                                                  |
| :-------------|:-------| :-------------------------------------------------------------------------|
| dateBegin     | time   | Дата начала периода                                             |
| dateEnd       | time   | Дата окончания периода                                             |
| currency      | string | Код валюты (UZS или USD), в которой нужно вернуть денежные значения отчета              |


##### Пример запроса на endpoint /v2

```http
POST https://api.billz.uz/v2/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "reports.transfers",
	"params": {
		"dateBegin": "2020-10-01T00:00:00Z",
		"dateEnd": "2020-10-02T00:00:00Z",
		"currency": "UZS"
	},
	"id": "1200"
}
```

##### Параметры ответа

| Имя                | Тип  | Описание                      |
| :------------------|:-----| :-----------------------------|
| insDate         | string        | Дата и время перемещения товаров|
| productName     | string        | Наименование продукта|
| productID     | int64        | ID продукта|
| barCode         | string        | Баркод |
| vendorCode      | string        | Артикул |
| transferID      | int64         | ID Перемещения в системе BILLZ |
| officeSource    | string        | Наименование магазина отправителя |
| officeSourceID  | int64         | ID магазина отправителя |`
| officeTarget    | string        | Наименование магазина получателя |
| officeTargetID  | int64         | ID магазина получателя |`
| quantity        | int64         | Кол-во товаров |
| retailPrice     | float64       | Сумма товаров по цене продажи |
| supplyPrice     | float64       | Сумма товаров по цене поставки|
| additional			| JSON key-value | Свойства |


##### Пример ответа

```json
{
  "id": "1200",
  "jsonrpc": "2.0",
  "result": {
    "dateBegin": "2020-10-03T00:00:00Z",
    "dateEnd": "2020-10-04T00:00:00Z",
    "report": [
      {
        "insDate": "2020.10.03 15:03:47",
        "productUD": 10473722,
        "productName": "Капри",
        "barCode": "4680007210907",
        "vendorCode": "34234234",
        "transferID": 5123273,
        "officeSource": "Demo Store SD",
        "officeSourceID": 7,
        "officeTarget": "Demo Store Next",
        "officeTargetID": 8,
        "quantity": 1,
        "retailPrice": 210500,
        "supplyPrice": 113300,
        "additional": {
          "BRAND": "null",
          "CATEGORY": "test",
          "COLLECTION": "Зима-20",
          "COLOR": "01",
          "ПОСТАВЩИК": null
        },
      }
    ]
  }
}
```

## reports.imports

?> Отчет "Импорты". Возвращает товары, загруженные за указанный период

##### Параметры запроса

| Имя           | Тип    | Описание                                                                  |
| :-------------|:-------| :-------------------------------------------------------------------------|
| dateBegin     | time   | Дата начала периода                                             |
| dateEnd       | time   | Дата окончания периода                                             |
| currency      | string | Код валюты (UZS или USD), в которой нужно вернуть денежные значения отчета                                      |


##### Пример запроса

```http
POST https://api.billz.uz/v1/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "reports.imports",
	"params": {
		"dateBegin": "2020-10-01T00:00:00Z",
		"dateEnd": "2020-10-02T00:00:00Z",
		"currency": "UZS"
	},
	"id": "1200"
}
```

##### Параметры ответа

| Имя           | Тип    | Описание                                                                  |
| :-------------|:-------| :-------------------------------------------------------------------------|
| importDate                    | string 		     | Дата прихода |       
| importID                      | int64  		     | ID Прихода |        
| office                        | string 		     | Наименование Магазина |           
| officeID                      | int64  		     | ID Магазин |           
| productName                   | string 		     | Наименование продукта|           
| vendorCode                    | string 		     | Баркод |           
| barCode                       | string 		     | Артикул |           
| incoming                      | float64 			 | Приход |          
| sumIncomingRetailPrice        | float64 			 | Сумма прихода |            
| sumIncomingSupplyPrice        | float64 			 | Сумма прихода по цене закупки |             
| import                        | float64 			 | Импорт |             
| sumImportRetailPrice          | float64 			 | Сумма импорта |             
| sumImportSupplyPrice          | float64 			 | Сумма импорта по цене закупки |             
| incomingTransfer              | float64 			 | Входящий трансфер	 |             
| incomingTransferRetailPrice   | float64 			 | Сумма входящего трансфера по цене продажи |             
| incomingTransferSupplyPrice   | float64 			 | Сумма входящего трансфера по цене закупки |            
| expense                       | float64 			 | Расход	 |           
| sumExpense                    | float64 			 | Сумма расхода |              
| goodsSold                     | float64 			 | Продажи |          
| goodsSoldRetailPrice          | float64 			 | Сумма продаж |           
| writtenOff                    | float64 			 | Списания |           
| writtenOffRetailPrice         | float64 			 | Сумма списаний |            
| outgoingTransfer              | float64 			 | Исходящий трансфер |           
| sumOutgoingTransferRetailPrice| float64 			 | Сумма исходящего трансфера |             
| goodsBalance                  | float64 			 | Остаток |          
| goodsBalanceRetailPrice       | float64 			 | Сумма остатка |            
| retailPrice                   | float64 			 | Цена |            
| sumAmount                     | float64 			 | Общая сумма |    
| additional                    | JSON key-value | Свойства |         

 

##### Пример ответа

```json
{
  "id": "1200",
  "jsonrpc": "2.0",
  "result": {
    "dateBegin": "2020-10-01T00:00:00Z",
    "dateEnd": "2020-10-02T00:00:00Z",
    "report": [
      {
        "importDate": "2020.10.02",
        "importID": 171276,
        "office": "Demo Store Next",
        "officeID": 8,
        "productName": "Майка в полоску",
        "vendorCode": "CT01",
        "barCode": "6921734900272",
        "incoming": 3,
        "sumIncomingRetailPrice": 360000,
        "sumIncomingSupplyPrice": 312000,
        "import": 3,
        "sumImportRetailPrice": 360000,
        "sumImportSupplyPrice": 312000,
        "incomingTransfer": 0,
        "incomingTransferRetailPrice": 0,
        "incomingTransferSupplyPrice": 0,
        "expense": 1,
        "sumExpense": 120000,
        "goodsSold": 0,
        "goodsSoldRetailPrice": 0,
        "writtenOff": 0,
        "writtenOffRetailPrice": 0,
        "outgoingTransfer": 1,
        "sumOutgoingTransferRetailPrice": 120000,
        "goodsBalance": 2,
        "goodsBalanceRetailPrice": 240000,
        "retailPrice": 120000,
        "sumAmount": 240000,
        "additional": {
          "BRAND": "null",
          "CATEGORY": "test",
          "COLLECTION": "Зима-20",
          "COLOR": "01",
          "ПОСТАВЩИК": null
        },
      }
    ]
  }
}
```


## reports.imports V2

?> Отчет "Импорты". Возвращает товары, загруженные за указанный период c указанием даты и времени, а так же ID продуктов. Запрос выполянется на endpoint /v2

##### Параметры запроса

| Имя           | Тип    | Описание                                                                  |
| :-------------|:-------| :-------------------------------------------------------------------------|
| dateBegin     | time   | Дата начала периода                                             |
| dateEnd       | time   | Дата окончания периода                                             |
| currency      | string | Код валюты (UZS или USD), в которой нужно вернуть денежные значения отчета                                      |


##### Пример запроса на endpoint /v2

```http
POST https://api.billz.uz/v2/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "reports.imports",
	"params": {
		"dateBegin": "2020-10-01T00:00:00Z",
		"dateEnd": "2020-10-02T00:00:00Z",
		"currency": "UZS"
	},
	"id": "1200"
}
```

##### Параметры ответа

| Имя           | Тип    | Описание                                                                  |
| :-------------|:-------| :-------------------------------------------------------------------------|
| importDate                    | string 		     | Дата и время прихода товаров|       
| importID                      | int64  		     | ID Прихода |        
| importTypeName                      | string  		     | Тип Прихода, заполняется только для импортов (приходов) |        
| office                        | string 		     | Наименование Магазина |           
| officeID                      | int64  		     | ID Магазина |    
| productID     | int64        | ID продукта|       
| productName                   | string 		     | Наименование продукта|           
| vendorCode                    | string 		     | Баркод |           
| barCode                       | string 		     | Артикул |           
| incoming                      | float64 			 | Приход |          
| sumIncomingRetailPrice        | float64 			 | Сумма прихода |            
| sumIncomingSupplyPrice        | float64 			 | Сумма прихода по цене закупки |             
| import                        | float64 			 | Импорт |             
| sumImportRetailPrice          | float64 			 | Сумма импорта |             
| sumImportSupplyPrice          | float64 			 | Сумма импорта по цене закупки |             
| incomingTransfer              | float64 			 | Входящий трансфер	 |             
| incomingTransferRetailPrice   | float64 			 | Сумма входящего трансфера по цене продажи |             
| incomingTransferSupplyPrice   | float64 			 | Сумма входящего трансфера по цене закупки |            
| expense                       | float64 			 | Расход	 |           
| sumExpense                    | float64 			 | Сумма расхода |              
| goodsSold                     | float64 			 | Продажи |          
| goodsSoldRetailPrice          | float64 			 | Сумма продаж |           
| writtenOff                    | float64 			 | Списания |           
| writtenOffRetailPrice         | float64 			 | Сумма списаний |            
| outgoingTransfer              | float64 			 | Исходящий трансфер |           
| sumOutgoingTransferRetailPrice| float64 			 | Сумма исходящего трансфера |             
| goodsBalance                  | float64 			 | Остаток |          
| goodsBalanceRetailPrice       | float64 			 | Сумма остатка |            
| retailPrice                   | float64 			 | Цена |            
| sumAmount                     | float64 			 | Общая сумма |    
| additional                    | JSON key-value | Свойства |         

 

##### Пример ответа

```json
{
  "id": "1200",
  "jsonrpc": "2.0",
  "result": {
    "dateBegin": "2020-10-01T00:00:00Z",
    "dateEnd": "2020-10-02T00:00:00Z",
    "report": [
      {
        "importDate": "2020.10.02 22:14:02",
        "importID": 171276,
        "office": "Demo Store Next",
        "officeID": 8,
        "productName": 398293,
        "productName": "Майка в полоску",
        "vendorCode": "CT01",
        "barCode": "6921734900272",
        "incoming": 3,
        "sumIncomingRetailPrice": 360000,
        "sumIncomingSupplyPrice": 312000,
        "import": 3,
        "sumImportRetailPrice": 360000,
        "sumImportSupplyPrice": 312000,
        "incomingTransfer": 0,
        "incomingTransferRetailPrice": 0,
        "incomingTransferSupplyPrice": 0,
        "expense": 1,
        "sumExpense": 120000,
        "goodsSold": 0,
        "goodsSoldRetailPrice": 0,
        "writtenOff": 0,
        "writtenOffRetailPrice": 0,
        "outgoingTransfer": 1,
        "sumOutgoingTransferRetailPrice": 120000,
        "goodsBalance": 2,
        "goodsBalanceRetailPrice": 240000,
        "retailPrice": 120000,
        "sumAmount": 240000,
        "additional": {
          "BRAND": "null",
          "CATEGORY": "test",
          "COLLECTION": "Зима-20",
          "COLOR": "01",
          "ПОСТАВЩИК": null
        },
      }
    ]
  }
}
```

## reports.consolidated

?> Отчет "Сводный". Возвращает сводный отчет по товарам за указанный период

##### Параметры запроса

| Имя           | Тип    | Описание                                                                  |
| :-------------|:-------| :-------------------------------------------------------------------------|
| dateBegin     | time   | Дата начала периода                                             |
| dateEnd       | time   | Дата окончания периода                                             |
| currency      | string | Код валюты (UZS или USD), в которой нужно вернуть денежные значения отчета                                      |


##### Пример запроса

```http
POST https://api.billz.uz/v1/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "reports.consolidated",
	"params": {
		"dateBegin": "2020-10-01T00:00:00Z",
		"dateEnd": "2020-10-02T00:00:00Z",
		"currency": "UZS"
	},
	"id": "1200"
}
```

##### Параметры ответа

| Имя                | Тип  | Описание                      |
| :------------------|:-----| :-----------------------------|
| insDate            | string  | Дата |
| office             | string  | Наименование Магазина |
| officeID           | int64   | ID Магазин |
| grossSales         | float64 | Выручка |
| mdAmount           | float64 | Сумма скидки |
| discountProcent    | string  | Процент Скидки |
| refundQty          | int64   | Кол-во возвращенных товаров |
| refundGross        | float64 | Возвраты по цене продажи |
| refundNet          | float64 | Возвраты по цене со скидкой |
| refundSupply       | float64 | Возвраты по цене закупки |
| netRevenue         | float64 | Чистая выручка |
| purchasePriceSales | float64 | Продажи по цене закупки |
| netProfit          | float64 | Чистая прибыль |
| avgMargin          | float64 | Средняя маржа |
| soldQty            | int64   | Кол-во проданных товаров |
| importQty          | int64   | Импорт, кол-во |
| importRetailPrice  | float64 | Импорт по цене продажи |
| importSupplyPrice  | float64 | Импорт по цене закупки |
| totalCount         | int64   | Начальный остаток |
| stokRetailPrice    | float64 | Сумма начального остатка по цене продаж |
| stokSupplyPrice    | float64 | Сумма начального остатка по цене закупки |
| transactionCount   | int64   | Количество транзакций |
| transactionSold    | int64   | Количество продаж |
| transactionReturn  | int64   | Количество возвратов |
| transactionExchange| int64   | Количество обменов |
| billProdCount      | float64 | Среднее кол-во товаров в чеке |
| avgBill            | float64 | Средний чек |
| billProdAvgPrice   | float64 | Средняя цена товара в чеке |
| salesPerSm         | float64 | Продажи на кв.м. |

##### Пример ответа

```json
{
  "id": "1200",
  "jsonrpc": "2.0",
  "result": {
    "dateBegin": "2020-10-01T00:00:00Z",
    "dateEnd": "2020-10-02T00:00:00Z",
    "report": [
      {
        "insDate": "2020.10.01",
        "office": "Demo Brand",
        "officeID": 6,
        "grossSales": 0,
        "mdAmount": 0,
        "discountProcent": "",
        "refundQty": 0,
        "refundGross": 0,
        "refundNet": 0,
        "refundSupply": 0,
        "netRevenue": 0,
        "purchasePriceSales": 0,
        "netProfit": 0,
        "avgMargin": 0,
        "soldQty": 0,
        "importQty": 0,
        "importRetailPrice": 0,
        "importSupplyPrice": 0,
        "totalCount": 27282,
        "stokRetailPrice": 1.8130610848e+10,
        "stokSupplyPrice": 3.7124109378863e+13,
        "transactionCount": 0,
        "transactionSold": 0,
        "transactionReturn": 0,
        "transactionExchange": 0,
        "billProdCount": 0,
        "avgBill": 0,
        "billProdAvgPrice": 0,
        "salesPerSm": 0
      }
    ]
  }
}
```

## reports.cheques

?> Отчет "Чеки". Возвращает список продаж, совершенных за указанный период в разбивке по типам оплат

##### Параметры запроса

| Имя                  | Тип  | Описание                                                                  |
| :--------------------|:-----| :-------------------------------------------------------------------------|
| dateBegin     | time   | Дата начала периода                                             |
| dateEnd       | time   | Дата окончания периода                                             |
| Office      | []int | Спиок ID  магазинов. Для всех магазинов параметр можно пропустить                                 |


##### Пример запроса

```http
POST https://api.billz.uz/v1/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "reports.cheques",
	"params": {
		"dateBegin": "2021-08-16T00:00:00Z",
		"dateEnd": "2021-08-17T00:00:00Z",
		"Office":[7,8]
	},
	"id": "1200"
}
```

##### Параметры ответа

| Имя             | Тип  | Описание                      |
| :---------------|:-----| :-----------------------------|
| saleDate            | string         | Дата продажи|
| ID                  | int64          | Номер транзакции|
| officeID            | int64          | ID магазина|
| officeName          | string         | Наименование магазина |
| transactionType     | string         | Тип транзакции: Продажа, Возврат, Обмен |
| soldProductsNum     | int            | Кол-во проданных товаров |
| returnedProductsNum | ште            | Кол-во возвращенных товаров |
| sumAmount           | float64        | Сумма оплаты (Всего) |
| retailPriceUzs      | float64        | Сумма оплаты без скидки |
| avgPrice            |  float64       | Средняя цена за товар в чек|
| additional	        | JSON key-value | Типы платежей и суммы |


##### Пример ответа

```json
{
  "id": "1200",
  "jsonrpc": "2.0",
  "result": {
    "dateBegin": "2021-08-16T00:00:00Z",
    "dateEnd": "2021-08-17T00:00:00Z",
    "report": [
      {
        "saleDate": "16.08.2021 12:00:00",
        "ID": 4844336,
        "officeID": 8,
        "officeName": "Demo Store Next",
        "transactionType": "Возврат",
        "soldProductsNum": 0,
        "returnedProductsNum": 1,
        "sumAmount": 219000,
        "retailPriceUzs": 219000,
        "avgPrice": 219000,
        "additional": {
          "CLICK": 0,
          "HUMO": 0,
          "PAYME": 0,
          "PAYMO": 0,
          "PAYPAL": 0,
          "UDS": 0,
          "UZCARD": 0,
          "VOUCHER": 0,
          "В ДОЛГ": 0,
          "ДЕНЕЖНЫЙ БАЛАНС": 0,
          "НАЛИЧНЫЕ": -1.2e+06
        }
      },
      {
        "saleDate": "16.08.2021 11:59:37",
        "ID": 0,
        "officeID": 8,
        "officeName": "Demo Store Next",
        "transactionType": "Продажа",
        "soldProductsNum": 4844338,
        "returnedProductsNum": 1,
        "sumAmount": 1.2e+06,
        "retailPriceUzs": 1.2e+06,
        "avgPrice": 0,
        "additional": {
          "CLICK": 0,
          "HUMO": 0,
          "PAYME": 0,
          "PAYMO": 0,
          "PAYPAL": 0,
          "UDS": 0,
          "UZCARD": 0,
          "VOUCHER": 0,
          "В ДОЛГ": 0,
          "ДЕНЕЖНЫЙ БАЛАНС": 0,
          "НАЛИЧНЫЕ": 1.2e+06
        }
      }
    ]
  }
}
```
## reports.writeoffs

?> Отчет "Списания". Возвращает товары, списанные за указанный период

##### Параметры запроса

| Имя           | Тип    | Описание                                                                  |
| :-------------|:-------| :-------------------------------------------------------------------------|
| dateBegin     | time   | Дата начала периода                                             |
| dateEnd       | time   | Дата окончания периода                                             |
| officeIDs      | string | список ID магазинов для отчета                                      |


##### Пример запроса

```http
POST https://api.billz.uz/v1/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "reports.writeoffs",
	"params": {
		"dateBegin": "2023-01-01T00:00:00+05:00",
		"dateEnd": "2023-10-01T00:00:00+05:00",
		"officeIDs": "7,8"
	},
	"id": "1200"
}
```

##### Параметры ответа
| Имя           | Тип    | Описание                                                                  |
| :-------------|:-------| :-------------------------------------------------------------------------|
|processID                     |int64            |ID процесса                                        |
|writeoffTypeName                     |string            |Тип списания                                        |
|user                     |string            |Пользователь                                        |
|writeoffEndDate                     |string            |Дата завершения                                        |
|office                     |string            |Магазин                                        |
|officeID                     |int64            |ID магазина                                        |
|productID                     |int64            |ID товара                                        |
|productName                     |string            |Название                                        |
|vendorCode                     |string            |Артикул                                        |
|barCode                     |string            |Баркод                                        |
|category                     |string            |Категория                                        |
|subCategory                     |string            |Подкатегория                                        |
|color                     |string            |Цвет                                        |
|size                     |string            |Размер                                        |
|brand                     |string            |Бренд                                        |
|writtenOff                     |int64            |Списано                                        |
|supplyPriceUSD                     |float64            |Цена поставки USD                                        |
|supplyPriceUZS                     |float64            |Цена поставки UZS                                        |
|retailPriceUSD                     |float64            |Цена продажи USD                                        |
|retailPriceUZS                     |float64            |Цена продажи UZS                                        |
|sumSupplyPriceUSD                     |float64            |Сумма по цене поставки USD                                        |
|sumRetailPriceUZS                     |float64            |Сумма по цене продажи UZS                                        |
   
##### Пример ответа

```json
{
  "id": "1200",
  "jsonrpc": "2.0",
  "result": {
    "dateBegin": "2020-10-01T00:00:00Z",
    "dateEnd": "2020-10-02T00:00:00Z",
    "report": [
      {
        "processID": "2020.10.01",
        "writeoffTypeName": "Списание",
        "user": "admin",
        "writeoffEndDate": "2020-10-02T00:00:00Z",
        "office": "Demo store",
        "officeID": 8,
        "productID": 46388289,
        "productName": "Туфли",
        "vendorCode": "123456",
        "barCode": "123456",
        "category": "Обувь",
        "subCategory": "Туфли",
        "color": "Черный",
        "size": "40",
        "brand": "Nike",
        "writtenOff": 2,
        "supplyPriceUSD": 1,
        "supplyPriceUZS": 12000,
        "retailPriceUSD": 12,
        "retailPriceUZS": 24000,
        "sumSupplyPriceUSD": 2,
        "sumRetailPriceUZS": 48000
	  
      }
    ]
  }
}
```

## reports.inventory

?> Отчет "Итоги инветаризации". Возвращает отчет по товарам участвующим в заданной инвентаризации

##### Параметры запроса

| Имя           | Тип    | Описание                                                                  |
| :-------------|:-------| :-------------------------------------------------------------------------|
| stockList            | string | Идентификатор инвентаризации, берется из системы BILLZ       |

##### Пример запроса

```http
POST https://api.billz.uz/v1/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "reports.inventory",
	"params": {
		"stockList": "142342"
	},
	"id": "1200"
}
```

##### Параметры ответа

| Имя                | Тип  | Описание                      |
| :------------------|:-----| :-----------------------------|
| Id                 | int64                    | ID товара |
| productName        | string                   | Наименование продукта |
| barCode            | string                   | Баркод |
| vendorCode         | string                   | Артикул |
| stated             | int64                    | Кол-во заявленных товаров в инвентаризации |
| found              | int64                    | Кол-во найденных товаров в инвентаризации |
| supplyPriceUSD     | float64                  | Цена поставки товара в USD |
| supplyPriceUZS     | float64                  | Цена поставки товара в UZS |
| retailPriceUSD     | float64                  | Цена продажи товара в USD |
| retailPriceUZS     | float64                  | Цена продажи товара в USD |
| sold               | int64                    | Кол-во проданных товаров во время инвентаризации |
| writeoff           | int64                    | Кол-во списанных товаров во время инвентаризации |
| transfer           | int64                    | Кол-во перемещенных товаров во время инвентаризации |
| writeoffResult     | int64                    | Кол-во списанных товаров в результате инвентаризации |
| import             | int64                    | Кол-во импортированных товаров в результате инвентаризации |
| additional         | map[string]interface{}   | Массив со свойствами товаров |

##### Пример ответа

```json
{
  "id": "1",
  "jsonrpc": "2.0",
  "result":{
  "stockList": "116368",
  "report":[
    {
       "id": 1348843,
       "productName": "Stocktaking_1",
       "barCode": "000001",
       "vendorCode": "000001",
       "stated": 17,
       "found": 10,
       "supplyPriceUSD": 13,
       "supplyPriceUZS": 130000,
       "retailPriceUSD": 3.6,
       "retailPriceUZS": 36000,
       "sold": 0,
       "writeoff": 0,
       "transfer": 0,
       "writeoffResult": 0,
       "import": 0,
       "additional":{
              "BARCODE_ORG": null,
              "BATCH_CODE": null,
              "BOT_CATEG": null,
              "BOT_INSOLE": null,
              "BOT_MATERIAL": null,
              "BOT_MODEL": null,
              "BOT_SUBCAT": null,
              "BRAND": null,
              "CATEGORY": null,
              "COLLECTION": null,
              "COLOR": null,
              "COLOR_CODE": null,
              "DESCRIPTION": null,
              "EXP_DATE": null,
              "GENDER": null,
              "GS1_PRODUCT_NAME": null,
              "GS1_PRODUCT_NAME1": null,
              "INSOLE": null,
              "IS_MARKED": null,
              "MATERIAL": null,
              "MODEL_NAME": null,
              "ORIGINAL_SP_USD": null,
              "PART_": null,
              "SEASON": null,
              "SIZE": null,
              "SUB_CATEGORY": null,
              "SUB_NAME": null,
              "SUPPLIER": null,
              "SUPPLIERS": null,
              "TEST": null,
              "TEST_PROP": null,
              "THEME": null,
              "TOP_VARIATIONS": null,
              "ДАТА_ПРИХОДА": null,
              "КОНТРАКТ": null,
              "ОБИВКА": null,
              "ПОСТАВШИК": null,
              "СРОК_ГОДНОСТИ2": null
        }
    }
    ]
  }
}
```

## reports.fin.transactions

?> Отчет "Финансовые транзакции". Возвращает список финансовых транзакций, совершенных за указанный период с учетом типов счетов

##### Параметры запроса

| Имя                  | Тип  | Описание                                                                  |
| :--------------------|:-----| :-------------------------------------------------------------------------|
| dateBegin     | time   | Дата начала периода                                             |
| dateEnd       | time   | Дата окончания периода                                             |

##### Пример запроса

```http
POST https://api.billz.uz/v1/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "reports.fin.transactions",
	"params": {
		"dateBegin": "2021-08-16T00:00:00Z",
		"dateEnd": "2021-08-17T00:00:00Z"
	},
	"id": "1200"
}
```

##### Параметры ответа

| Имя             | Тип  | Описание                      |
| :---------------|:-----| :-----------------------------|
| ID                    | int64          | ID Транзакции|
| status                | string         | Статус|
| userName              | string         | Имя пользователя, создавшего транзакцию |
| transactionType       | string         | Тип транзакции |
| category              | string         | Категория |
| subCategory           | string         | Подкатегория|
| account               | string         | Счет операции |
| accountSend           | string         | Счет отправки|
| accountReceive        | string         | Счет получения|
| amount                | float64        | Сумма|
| actualReceivedAmount  | float64        | Фактически получено|
| currency              | string         |  Код валюты|
| rateValue	            | float64        | Курс валюты|
| insDate               | time           | Дата создания|
| endDate               | time           | Дата завершения|
| msg                   | string         | Комментарий |


##### Пример ответа

```json
{
  "id": "1200",
  "jsonrpc": "2.0",
  "result": {
    "dateBegin": "2021-11-01T00:00:00Z",
    "dateEnd": "2021-11-15T00:00:00Z",
    "report": [
      {
        "id": 78926,
        "dtatus": "",
        "userName": "DEMO_BRAND.BAXTI",
        "transactionType": "Доход",
        "category": "инвестиции",
        "subCategory": "",
        "account": "Demo Store Next Касса",
        "accountSend": "",
        "accountReceive": "",
        "amount": 5e+06,
        "actualReceivedAmount": 0,
        "currency": "UZS",
        "rateValue": 0,
        "insDate": "2021-11-08T14:40:32",
        "endDate": "2021-11-08T14:40:32",
        "msg": "Махмудов Шерзод дал деньги"
      },
    ]
  }
}
```


## reports.clients.stats

?> Отчет "Статистика по клиентам". Возвращает количество клиентов за период в разбивке по магазинам. *Все клиенты* - это общее количество покупателей, совершивших покупки за период. *Новые клиенты* - это покупатели, совершившую свою первую покупку в указанный период. *Возвращающиеся клиенты* - это покупатели, совершившую вторую (или более) покупку в указанный период. Если новый клиент совершил 2 ( и более) покупки в указанный период, то он считается как "новый", так и "возвращающийся"

##### Параметры запроса

| Имя                  | Тип  | Описание                                                                  |
| :--------------------|:-----| :-------------------------------------------------------------------------|
| dateBegin     | time   | Дата начала периода                                             |
| dateEnd       | time   | Дата окончания периода                                             |

##### Пример запроса

```http
POST https://api.billz.uz/v1/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "reports.clients.stats",
	"params": {
		"dateBegin": "2022-01-01T00:00:00Z",
		"dateEnd": "2022-02-01T00:00:00Z"
	},
	"id": "1200"
}
```

##### Параметры ответа

| Имя             | Тип  | Описание                      |
| :---------------|:-----| :-----------------------------|
| dateBegin                  | date        | дата начала периода|
| dateEnd                    | date        | дата окончания периода|
| report[].officeName        | string      | Наименование магазина |
| report[].clientsTotal      | int         | количество всех клиентов совершивших покупки|
| report[].clientsNew        | int         | количество новых клиентов |
| report[].clientsExisting   | int         | количество возвращающихся клиентов  |



##### Пример ответа

```json
{
	"id": "1200",
	"jsonrpc": "2.0",
	"result": {
		"dateBegin": "2022-01-01T00:00:00Z",
		"dateEnd": "2022-02-01T00:00:00Z",
		"report": [
			{
				"officeName": "Demo Store SD",
				"clientsTotal": 16,
				"clientsNew": 6,
				"clientsExisting": 14
			},
			{
				"officeName": "Demo Store Next",
				"clientsTotal": 10,
				"clientsNew": 6,
				"clientsExisting": 6
			}
		]
	}
}
```


## import.create

?> Создает импорт. Возвращает Id импорта в случае успешного завершения метода

##### Параметры запроса

| Имя           | Тип    | Описание                                                                  |
| :-------------|:-------| :-------------------------------------------------------------------------|
| officeID      | int    | Офис, в котором необходимо создать импорт                                             |
| items         | array  | Свойства продукта                                             |
| Id            | string | Баркод       |
| sku           | string | Артикул       |
| category      | string | Категория продукта       |
| name          | string | Название продукта       |
| price         | int    | Цена продукта       |
| quantity      | int    | Кол-во единиц       |

##### Пример запроса

```http
POST https://api.billz.uz/v1/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "import.create",
	"params": {
		"officeID": 1115,
			"items": [
			{
				"id": "333333333333333333333",
				"sku": "8739eb18-0d03-11ea-80d9-000c29f3b2cd",
				"category": "Test",
				"name": "Защитное Стекло Для Xiaomi Redmi Note 8 Transparent",
				"price": 2699900,
				"quantity": 149
			}
			]
	},
	"id": "1200"
}
```

##### Параметры ответа

| Имя                | Тип  | Описание                      |
| :------------------|:-----| :-----------------------------|
| importId           | int64   | ID созданного импорта |

##### Пример ответа

```json
{
  "id": "1200",
  "jsonrpc": "2.0",
  "result": {
    "ImportId": 1243423
  }
}
```

## import.createWithOffice

?> Создает импорт. Возвращает Id импорта в случае успешного завершения метода. В данном методе для каждого товара можно указать склад и кол-во, на котором его создавать

##### Параметры запроса

| Имя           | Тип    | Описание                                                                  |
| :-------------|:-------| :-------------------------------------------------------------------------|
| items         | array  | Свойства продукта                                             |
| Id            | string | Баркод       |
| sku           | string | Артикул       |
| category      | string | Категория продукта       |
| name          | string | Название продукта       |
| price         | int    | Цена продукта       |
| details       | array  | Детали продукта                                             |
| officeID      | int    | Офис, в котором необходимо создать импорт                                             |
| quantity      | int    | Кол-во единиц       |

##### Пример запроса

```http
POST https://api.billz.uz/v1/ HTTP/1.1
Content-Type: application/json; charset=UTF-8
Authorization: Bearer a.b.c
Cache-Control: no-cache

{
	"jsonrpc": "2.0",
	"method": "import.createWithOffice",
	"params": {
		"items": [
		{
			"id": "333333333333333333333",
			"sku": "8739eb18-0d03-11ea-80d9-000c29f3b2cd",
			"category": "Test",
			"name": "Защитное Стекло Для Xiaomi Redmi Note 8 Transparent",
			"price": 2699900,
			"details": [
			{
				"officeID": 1115,
				"quantity": 149
			}
			]
		}
		]
	},
	"id": "1200"
}
```

##### Параметры ответа

| Имя                | Тип  | Описание                      |
| :------------------|:-----| :-----------------------------|
| importId           | int64   | ID созданного импорта |

##### Пример ответа

```json
{
  "id": "1200",
  "jsonrpc": "2.0",
  "result": {
    "ImportId": 1243423
  }
}
```

