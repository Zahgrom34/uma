// Transcribed one-time from umabranduz/src/App.jsx (contract cms-v1 §3, import script seed data).
// Values are byte-identical to the legacy literals — do not retranslate or "improve" them.
import type { Lang } from '@uma/shared';

export interface SeedProductCopy { name: string; color: string; material: string; desc: string }

/** uz/en translations per legacy product id (ru lives in umabranduz/src/data.js). */
export const productCopy: Record<string, { uz: SeedProductCopy; en: SeedProductCopy }> = {
  "uma-sequin-dress": {
    "uz": {
      "name": "Payetkali ko‘ylak",
      "color": "Kulrang / siyoh rang",
      "material": "100% poliester",
      "desc": "To‘liq payetkalar bilan bezatilgan midi ko‘ylak. Kechki obraz uchun belga yopishgan siluet va ifodali tekstura."
    },
    "en": {
      "name": "Sequin dress",
      "color": "Grey / ink",
      "material": "100% polyester",
      "desc": "A midi dress fully embellished with sequins. A fitted silhouette and expressive texture for an evening look."
    }
  },
  "uma-maxi-ikat": {
    "uz": {
      "name": "Yig‘ma yengli maxi ko‘ylak",
      "color": "Sokin binafsha",
      "material": "95% poliester, 5% spandeks",
      "desc": "Ikat naqshli va uzun yig‘ma yengli maxi ko‘ylak."
    },
    "en": {
      "name": "Maxi dress with gathered sleeves",
      "color": "Soft violet",
      "material": "95% polyester, 5% spandex",
      "desc": "A maxi dress in an ikat pattern with long gathered sleeves."
    }
  },
  "uma-guipure-pants": {
    "uz": {
      "name": "Gipyur shimlar",
      "color": "Qora",
      "material": "90% neylon, 10% spandeks",
      "desc": "Fermuarli, to‘g‘ri siluetdagi gipyur shimlar."
    },
    "en": {
      "name": "Guipure trousers",
      "color": "Black",
      "material": "90% nylon, 10% spandex",
      "desc": "Straight-cut guipure trousers with a zip fastening."
    }
  },
  "uma-heart-bag": {
    "uz": {
      "name": "Ikat naqshli yurak-sumka",
      "color": "Qora / binafsha",
      "material": "Poliuretan va poliester",
      "desc": "Ikat naqshli va yelkaga taqiladigan kamarli shaklli sumka."
    },
    "en": {
      "name": "Heart bag with ikat print",
      "color": "Black / violet",
      "material": "Polyurethane and polyester",
      "desc": "A shaped bag with an ikat ornament and shoulder strap."
    }
  },
  "uma-zarhal-scarf": {
    "uz": {
      "name": "«Oltin sher» satin sharf",
      "color": "Qizil",
      "material": "100% poliester",
      "desc": "«Oltin sher» imzo naqshli satin sharf."
    },
    "en": {
      "name": "“Golden Lion” satin scarf",
      "color": "Red",
      "material": "100% polyester",
      "desc": "A satin scarf with the signature “Golden Lion” ornament."
    }
  },
  "uma-zarhal-ring": {
    "uz": {
      "name": "«Oltin sher» uzugi",
      "color": "Oltin rang",
      "material": "Latun",
      "desc": "Oltin tusdagi latundan yasalgan shaklli uzuk."
    },
    "en": {
      "name": "“Golden Lion” ring",
      "color": "Gold",
      "material": "Brass",
      "desc": "A sculptural brass ring in a golden finish."
    }
  },
  "navo": {
    "uz": {
      "name": "Navo ko‘ylagi",
      "color": "Sutli oq",
      "material": "100% zig‘ir",
      "desc": "Yumshoq bel chizig‘i va ifodali hajmga ega midi ko‘ylak."
    },
    "en": {
      "name": "Navo dress",
      "color": "Milky white",
      "material": "100% linen",
      "desc": "A midi dress with a soft waistline and expressive volume."
    }
  },
  "sabo": {
    "uz": {
      "name": "Sabo jaketi",
      "color": "Grafit",
      "material": "Jun va viskoza",
      "desc": "Erkin bichimli, strukturali bir bortli jaket."
    },
    "en": {
      "name": "Sabo blazer",
      "color": "Graphite",
      "material": "Wool and viscose",
      "desc": "A structured single-breasted blazer in a relaxed cut."
    }
  },
  "mavj": {
    "uz": {
      "name": "Mavj bluzasi",
      "color": "Oq",
      "material": "100% paxta",
      "desc": "Yig‘ma detallari va uzun manjetli yengil bluzka."
    },
    "en": {
      "name": "Mavj blouse",
      "color": "White",
      "material": "100% cotton",
      "desc": "An airy blouse with gathered details and long cuffs."
    }
  },
  "sahar": {
    "uz": {
      "name": "Sahar trenchi",
      "color": "Tosh rang",
      "material": "Paxta",
      "desc": "Belbog‘li va chuqur cho‘ntakli erkin trench."
    },
    "en": {
      "name": "Sahar trench coat",
      "color": "Stone",
      "material": "Cotton",
      "desc": "A relaxed trench coat with a belt and deep pockets."
    }
  },
  "lale": {
    "uz": {
      "name": "Lale sumkasi",
      "color": "Krem rang",
      "material": "Tabiiy teri",
      "desc": "Qisqa tutqichli, strukturali sumka."
    },
    "en": {
      "name": "Lale bag",
      "color": "Cream",
      "material": "Genuine leather",
      "desc": "A structured bag with a short handle."
    }
  },
  "malika": {
    "uz": {
      "name": "Malika myulilari",
      "color": "Sutli oq",
      "material": "Tabiiy teri",
      "desc": "Barqaror poshnali minimalistik charm myulilar."
    },
    "en": {
      "name": "Malika mules",
      "color": "Milky white",
      "material": "Genuine leather",
      "desc": "Minimalist leather mules with a stable heel."
    }
  },
  "dilnoza-midi": {
    "uz": {
      "name": "Dilnoza ko‘ylagi",
      "color": "Anor rang",
      "material": "Viskoza va ipak",
      "desc": "Yumshoq drapirovka va bel chizig‘i aksentli midi ko‘ylak."
    },
    "en": {
      "name": "Dilnoza dress",
      "color": "Pomegranate",
      "material": "Viscose and silk",
      "desc": "A midi dress with soft draping and an accent waistline."
    }
  },
  "rayhon-skirt": {
    "uz": {
      "name": "Rayhon yubkasi",
      "color": "Tungi ko‘k",
      "material": "Viskoza",
      "desc": "Baland belli va toza bel chizig‘iga ega oqimli midi yubka."
    },
    "en": {
      "name": "Rayhon skirt",
      "color": "Midnight blue",
      "material": "Viscose",
      "desc": "A fluid high-waisted midi skirt with a clean waistband."
    }
  },
  "nilufar-top": {
    "uz": {
      "name": "Nilufar topi",
      "color": "Fil suyagi rang",
      "material": "Zig‘ir va paxta",
      "desc": "Arxitekturaviy chiziqlar va yumshoq o‘tirishga ega lakonik zig‘ir top."
    },
    "en": {
      "name": "Nilufar top",
      "color": "Ivory",
      "material": "Linen and cotton",
      "desc": "A concise linen top with architectural lines and a soft fit."
    }
  },
  "samarqand-belt": {
    "uz": {
      "name": "Samarqand kamari",
      "color": "Karamel rang",
      "material": "Tabiiy teri",
      "desc": "Lakonik metall to‘qali charm kamar."
    },
    "en": {
      "name": "Samarqand belt",
      "color": "Caramel",
      "material": "Genuine leather",
      "desc": "A leather belt with a concise metal buckle."
    }
  },
  "bukhara-earrings": {
    "uz": {
      "name": "Buxoro ziraklari",
      "color": "Oltin rang",
      "material": "Latun",
      "desc": "Yumshoq jilva va sharqona xarakterga ega haykaltaroshlik uslubidagi ziraklar."
    },
    "en": {
      "name": "Bukhara earrings",
      "color": "Gold",
      "material": "Brass",
      "desc": "Sculptural earrings with a soft sheen and an eastern character."
    }
  },
  "zarafshan-tote": {
    "uz": {
      "name": "Zarafshon sumkasi",
      "color": "Konyak rang",
      "material": "Tabiiy teri",
      "desc": "Qisqa tutqichli va yechib olinadigan kamarli sig‘imli charm sumka."
    },
    "en": {
      "name": "Zarafshan bag",
      "color": "Cognac",
      "material": "Genuine leather",
      "desc": "A roomy leather bag with short handles and a detachable strap."
    }
  },
  "nigora-mini": {
    "uz": {
      "name": "Nigora mini-sumkasi",
      "color": "Qora",
      "material": "Tabiiy teri",
      "desc": "Eng kerakli buyumlar uchun aniq shakldagi ixcham sumka."
    },
    "en": {
      "name": "Nigora mini bag",
      "color": "Black",
      "material": "Genuine leather",
      "desc": "A compact, sharply shaped bag for everyday essentials."
    }
  },
  "zebo-slingback": {
    "uz": {
      "name": "Zebo tuflilari",
      "color": "Qora",
      "material": "Tabiiy teri",
      "desc": "Ochiq tovonli, ingichka tasma va barqaror poshnali tuflilar."
    },
    "en": {
      "name": "Zebo slingback shoes",
      "color": "Black",
      "material": "Genuine leather",
      "desc": "Slingback shoes with a slim strap and a stable heel."
    }
  },
  "sadaf-loafers": {
    "uz": {
      "name": "Sadaf loferlari",
      "color": "Bordo",
      "material": "Tabiiy teri",
      "desc": "Zamonaviy cho‘ziq shakldagi yumshoq charm loferlar."
    },
    "en": {
      "name": "Sadaf loafers",
      "color": "Burgundy",
      "material": "Genuine leather",
      "desc": "Soft leather loafers with a modern elongated shape."
    }
  }
};

/** Merged legacy UI-string catalog (translations + extraTranslations + later Object.assign batches). */
export const uiStrings: Record<string, Record<Lang, string>> = {
  "notice": {
    "ru": "Бесплатная доставка от 1 500 000 сум",
    "uz": "1 500 000 soʻmdan bepul yetkazib berish",
    "en": "Free delivery from 1,500,000 UZS"
  },
  "more": {
    "ru": "Подробнее →",
    "uz": "Batafsil →",
    "en": "Learn more →"
  },
  "menu": {
    "ru": "Меню",
    "uz": "Menyu",
    "en": "Menu"
  },
  "search": {
    "ru": "Поиск",
    "uz": "Qidiruv",
    "en": "Search"
  },
  "account": {
    "ru": "Аккаунт",
    "uz": "Hisob",
    "en": "Account"
  },
  "favourites": {
    "ru": "Избранное",
    "uz": "Sevimlilar",
    "en": "Favourites"
  },
  "bag": {
    "ru": "Корзина",
    "uz": "Savat",
    "en": "Bag"
  },
  "home": {
    "ru": "Главная страница",
    "uz": "Bosh sahifa",
    "en": "Home"
  },
  "about": {
    "ru": "О нас",
    "uz": "Biz haqimizda",
    "en": "About us"
  },
  "news": {
    "ru": "Новости",
    "uz": "Yangiliklar",
    "en": "News"
  },
  "contacts": {
    "ru": "Контакты",
    "uz": "Kontaktlar",
    "en": "Contact"
  },
  "services": {
    "ru": "Общие услуги",
    "uz": "Xizmatlar",
    "en": "Services"
  },
  "payment": {
    "ru": "Оплата",
    "uz": "Toʻlov",
    "en": "Payment"
  },
  "returns": {
    "ru": "Возврат",
    "uz": "Qaytarish",
    "en": "Returns"
  },
  "delivery": {
    "ru": "Служба доставки",
    "uz": "Yetkazib berish",
    "en": "Delivery"
  },
  "cabinet": {
    "ru": "Личный кабинет",
    "uz": "Shaxsiy kabinet",
    "en": "My account"
  },
  "orders": {
    "ru": "Мои заказы",
    "uz": "Buyurtmalarim",
    "en": "My orders"
  },
  "follow": {
    "ru": "Подпишитесь на нас",
    "uz": "Bizga obuna boʻling",
    "en": "Follow us"
  },
  "language": {
    "ru": "Регион и язык",
    "uz": "Hudud va til",
    "en": "Region and language"
  },
  "country": {
    "ru": "Узбекистан",
    "uz": "Oʻzbekiston",
    "en": "Uzbekistan"
  },
  "hero": {
    "ru": "Тихая сила",
    "uz": "Nafis kuch",
    "en": "Quiet power"
  },
  "heroEm": {
    "ru": "женственности",
    "uz": "ayollik",
    "en": "of femininity"
  },
  "viewCollection": {
    "ru": "Смотреть коллекцию",
    "uz": "Kolleksiyani ko‘rish",
    "en": "View collection"
  },
  "manifest": {
    "ru": "МАНИФЕСТ UMA",
    "uz": "UMA MANIFESTI",
    "en": "UMA MANIFEST"
  },
  "statement": {
    "ru": "Одежда, которая не перекрикивает женщину, а помогает ей звучать.",
    "uz": "Ayolni to‘sib qo‘ymaydigan, balki uning ovozini yanada yorqin qiladigan kiyimlar.",
    "en": "Clothes that do not speak over a woman, but help her voice be heard."
  },
  "openCollection": {
    "ru": "Открыть коллекцию →",
    "uz": "Kolleksiyani ochish →",
    "en": "Open collection →"
  },
  "linen": {
    "ru": "Лён и хлопок →",
    "uz": "Zig‘ir va paxta →",
    "en": "Linen and cotton →"
  },
  "evening": {
    "ru": "Вечерние образы →",
    "uz": "Kechki obrazlar →",
    "en": "Evening looks →"
  },
  "new": {
    "ru": "Новинки",
    "uz": "Yangi mahsulotlar",
    "en": "New arrivals"
  },
  "all": {
    "ru": "Все",
    "uz": "Barchasi",
    "en": "All"
  },
  "filters": {
    "ru": "Фильтры и сортировка",
    "uz": "Filtr va saralash",
    "en": "Filter & sort"
  },
  "items": {
    "ru": "товаров",
    "uz": "mahsulot",
    "en": "items"
  },
  "quickAdd": {
    "ru": "Быстро добавить",
    "uz": "Tez qo‘shish",
    "en": "Quick add"
  },
  "inStock": {
    "ru": "В наличии",
    "uz": "Mavjud",
    "en": "In stock"
  },
  "outOfStock": {
    "ru": "Нет в наличии",
    "uz": "Mavjud emas",
    "en": "Out of stock"
  },
  "left": {
    "ru": "Осталось",
    "uz": "Qoldi",
    "en": "Left"
  },
  "viewAll": {
    "ru": "Смотреть всё →",
    "uz": "Barchasini ko‘rish →",
    "en": "View all →"
  },
  "continueShopping": {
    "ru": "Продолжить покупки →",
    "uz": "Xaridni davom ettirish →",
    "en": "Continue shopping →"
  },
  "recent": {
    "ru": "Недавно просмотренные",
    "uz": "Yaqinda ko‘rilganlar",
    "en": "Recently viewed"
  },
  "catalog": {
    "ru": "КАТАЛОГ",
    "uz": "KATALOG",
    "en": "CATALOGUE"
  },
  "colour": {
    "ru": "Цвет",
    "uz": "Rang",
    "en": "Colour"
  },
  "chooseSize": {
    "ru": "Выберите размер",
    "uz": "O‘lchamni tanlang",
    "en": "Choose size"
  },
  "addToBag": {
    "ru": "Добавить в корзину",
    "uz": "Savatga qo‘shish",
    "en": "Add to bag"
  },
  "sizeGuide": {
    "ru": "Таблица размеров",
    "uz": "O‘lchamlar jadvali",
    "en": "Size guide"
  },
  "findSize": {
    "ru": "Подобрать размер",
    "uz": "O‘lchamni tanlash",
    "en": "Find your size"
  },
  "related": {
    "ru": "Похожие товары",
    "uz": "O‘xshash mahsulotlar",
    "en": "You may also like"
  },
  "sale": {
    "ru": "Распродажа",
    "uz": "Chegirmalar",
    "en": "Sale"
  },
  "clothing": {
    "ru": "Одежда",
    "uz": "Kiyimlar",
    "en": "Clothing"
  },
  "dresses": {
    "ru": "Платья",
    "uz": "Koʻylaklar",
    "en": "Dresses"
  },
  "accessories": {
    "ru": "Аксессуары",
    "uz": "Aksessuarlar",
    "en": "Accessories"
  },
  "bags": {
    "ru": "Сумки",
    "uz": "Sumkalar",
    "en": "Bags"
  },
  "shoes": {
    "ru": "Обувь",
    "uz": "Poyabzallar",
    "en": "Shoes"
  },
  "online": {
    "ru": "Онлайн-эксклюзив",
    "uz": "Onlayn eksklyuziv",
    "en": "Online exclusive"
  },
  "close": {
    "ru": "Закрыть",
    "uz": "Yopish",
    "en": "Close"
  },
  "previous": {
    "ru": "Предыдущее фото",
    "uz": "Oldingi surat",
    "en": "Previous image"
  },
  "next": {
    "ru": "Следующее фото",
    "uz": "Keyingi surat",
    "en": "Next image"
  },
  "photo": {
    "ru": "Фото",
    "uz": "Surat",
    "en": "Image"
  },
  "zoom": {
    "ru": "Увеличить",
    "uz": "Kattalashtirish",
    "en": "Zoom"
  },
  "details": {
    "ru": "Детали",
    "uz": "Tafsilotlar",
    "en": "Details"
  },
  "material": {
    "ru": "Материал",
    "uz": "Material",
    "en": "Material"
  },
  "care": {
    "ru": "Уход",
    "uz": "Parvarish",
    "en": "Care"
  },
  "deliveryPayment": {
    "ru": "Доставка и оплата",
    "uz": "Yetkazib berish va toʻlov",
    "en": "Delivery & payment"
  },
  "productInfo": {
    "ru": "Подробная информация о товаре и рекомендации по уходу.",
    "uz": "Mahsulot haqida batafsil maʼlumot va parvarish bo‘yicha tavsiyalar.",
    "en": "Detailed product information and care recommendations."
  },
  "notify": {
    "ru": "Сообщить о поступлении",
    "uz": "Kelganda xabar bering",
    "en": "Notify me when available"
  },
  "notificationOn": {
    "ru": "Уведомление включено",
    "uz": "Bildirishnoma yoqildi",
    "en": "Notification enabled"
  },
  "oneSize": {
    "ru": "Единый размер",
    "uz": "Yagona o‘lcham",
    "en": "One size"
  },
  "emptyFavourites": {
    "ru": "Пока ничего не сохранено",
    "uz": "Hali hech narsa saqlanmagan",
    "en": "Nothing saved yet"
  },
  "viewNew": {
    "ru": "Смотреть новинки",
    "uz": "Yangiliklarni ko‘rish",
    "en": "View new arrivals"
  },
  "emptyBag": {
    "ru": "Корзина пуста",
    "uz": "Savat bo‘sh",
    "en": "Your bag is empty"
  },
  "yourBag": {
    "ru": "Ваша корзина",
    "uz": "Sizning savatingiz",
    "en": "Your bag"
  },
  "addedToBag": {
    "ru": "Добавлено в корзину",
    "uz": "Savatga qo‘shildi",
    "en": "Added to bag"
  },
  "openBag": {
    "ru": "Открыть корзину",
    "uz": "Savatni ochish",
    "en": "View bag"
  },
  "remove": {
    "ru": "Удалить",
    "uz": "Olib tashlash",
    "en": "Remove"
  },
  "promo": {
    "ru": "Добавить промокод",
    "uz": "Promokod qo‘shish",
    "en": "Add discount code"
  },
  "enterPromo": {
    "ru": "Введите промокод",
    "uz": "Promokodni kiriting",
    "en": "Enter discount code"
  },
  "apply": {
    "ru": "Применить",
    "uz": "Qo‘llash",
    "en": "Apply"
  },
  "orderValue": {
    "ru": "Стоимость заказа",
    "uz": "Buyurtma qiymati",
    "en": "Order value"
  },
  "free": {
    "ru": "Бесплатно",
    "uz": "Bepul",
    "en": "Free"
  },
  "total": {
    "ru": "Итого",
    "uz": "Jami",
    "en": "Total"
  },
  "youMayLike": {
    "ru": "Вам может понравиться",
    "uz": "Sizga yoqishi mumkin",
    "en": "You may also like"
  },
  "checkout": {
    "ru": "Оформить заказ",
    "uz": "Buyurtmani rasmiylashtirish",
    "en": "Checkout"
  },
  "help": {
    "ru": "Нужна помощь?",
    "uz": "Yordam kerakmi?",
    "en": "Need help?"
  },
  "orderSummary": {
    "ru": "Состав заказа",
    "uz": "Buyurtma tarkibi",
    "en": "Order summary"
  },
  "checkoutStep": {
    "ru": "Оформление · шаг 1 из 2",
    "uz": "Rasmiylashtirish · 1-qadam, 2 dan",
    "en": "Checkout · step 1 of 2"
  },
  "deliveryUz": {
    "ru": "Доставка по Узбекистану",
    "uz": "Oʻzbekiston bo‘ylab yetkazib berish",
    "en": "Delivery across Uzbekistan"
  },
  "recipient": {
    "ru": "Данные получателя",
    "uz": "Qabul qiluvchi maʼlumotlari",
    "en": "Recipient details"
  },
  "firstName": {
    "ru": "Имя",
    "uz": "Ism",
    "en": "First name"
  },
  "lastName": {
    "ru": "Фамилия",
    "uz": "Familiya",
    "en": "Last name"
  },
  "address": {
    "ru": "Улица и номер дома",
    "uz": "Ko‘cha va uy raqami",
    "en": "Street name and number"
  },
  "city": {
    "ru": "Город",
    "uz": "Shahar",
    "en": "City"
  },
  "postalCode": {
    "ru": "Почтовый индекс",
    "uz": "Pochta indeksi",
    "en": "Postal code"
  },
  "phone": {
    "ru": "Номер телефона",
    "uz": "Telefon raqami",
    "en": "Phone number"
  },
  "continue": {
    "ru": "Продолжить",
    "uz": "Davom etish",
    "en": "Continue"
  },
  "confirmOrder": {
    "ru": "Подтвердить заказ",
    "uz": "Buyurtmani tasdiqlash",
    "en": "Confirm order"
  },
  "deliveryMethod": {
    "ru": "Способ доставки",
    "uz": "Yetkazib berish usuli",
    "en": "Delivery method"
  },
  "standardDelivery": {
    "ru": "Стандартная доставка",
    "uz": "Standart yetkazib berish",
    "en": "Standard delivery"
  },
  "estimatedDate": {
    "ru": "Ожидаемая дата",
    "uz": "Kutilayotgan sana",
    "en": "Estimated date"
  },
  "available": {
    "ru": "Доставка доступна",
    "uz": "Yetkazib berish mavjud",
    "en": "Delivery available"
  },
  "cardPayment": {
    "ru": "Банковской картой",
    "uz": "Bank kartasi",
    "en": "Pay by card"
  },
  "orderHistory": {
    "ru": "История заказов",
    "uz": "Buyurtmalar tarixi",
    "en": "Order history"
  },
  "orderHistoryLead": {
    "ru": "Оформленные заказы и актуальный статус доставки.",
    "uz": "Rasmiylashtirilgan buyurtmalar va ularning yetkazib berish holati.",
    "en": "Placed orders and their current delivery status."
  },
  "noOrders": {
    "ru": "Заказов пока нет",
    "uz": "Hozircha buyurtmalar yo‘q",
    "en": "No orders yet"
  },
  "noOrdersLead": {
    "ru": "После оформления здесь появятся состав и статус доставки.",
    "uz": "Buyurtma rasmiylashtirilgandan so‘ng uning tarkibi va holati shu yerda ko‘rinadi.",
    "en": "Your order details and delivery status will appear here after checkout."
  },
  "cancelOrder": {
    "ru": "Отменить заказ",
    "uz": "Buyurtmani bekor qilish",
    "en": "Cancel order"
  },
  "cancelReason": {
    "ru": "Причина отмены",
    "uz": "Bekor qilish sababi",
    "en": "Cancellation reason"
  },
  "confirmCancellation": {
    "ru": "Подтвердить отмену",
    "uz": "Bekor qilishni tasdiqlash",
    "en": "Confirm cancellation"
  },
  "keepOrder": {
    "ru": "Оставить заказ",
    "uz": "Buyurtmani saqlash",
    "en": "Keep order"
  },
  "guestTitle": {
    "ru": "Вы вошли как гость",
    "uz": "Siz mehmon sifatida kirdingiz",
    "en": "You are browsing as a guest"
  },
  "guestLead": {
    "ru": "Откройте иконку профиля, чтобы продолжить через Telegram или Google.",
    "uz": "Telegram yoki Google orqali davom etish uchun profil belgisini oching.",
    "en": "Open the profile icon to continue with Telegram or Google."
  },
  "settings": {
    "ru": "Настройки",
    "uz": "Sozlamalar",
    "en": "Settings"
  },
  "signOut": {
    "ru": "Выйти из аккаунта",
    "uz": "Shaxsiy kabinetdan chiqish",
    "en": "Sign out"
  },
  "quickAddTitle": {
    "ru": "Быстрое добавление",
    "uz": "Tez qo‘shish",
    "en": "Quick add"
  },
  "readyToAdd": {
    "ru": "Готово к добавлению",
    "uz": "Qo‘shishga tayyor",
    "en": "Ready to add"
  },
  "size": {
    "ru": "Размер",
    "uz": "O‘lcham",
    "en": "Size"
  },
  "shoeSize": {
    "ru": "Размер обуви",
    "uz": "Poyabzal o‘lchami",
    "en": "Shoe size"
  },
  "sizeHelp": {
    "ru": "Помощь с выбором",
    "uz": "O‘lcham bo‘yicha yordam",
    "en": "Size help"
  },
  "sizeGuideTitle": {
    "ru": "Таблица размеров",
    "uz": "O‘lchamlar jadvali",
    "en": "Size guide"
  },
  "sizeGuideLead": {
    "ru": "Если значение находится между двумя размерами, выбирайте больший для более свободной посадки.",
    "uz": "Agar o‘lchamingiz ikki o‘lcham oralig‘ida bo‘lsa, erkinroq turishi uchun kattaroq o‘lchamni tanlang.",
    "en": "If your measurement is between two sizes, choose the larger size for a looser fit."
  },
  "hours": {
    "ru": "Часы работы",
    "uz": "Ish vaqti",
    "en": "Opening hours"
  },
  "weekdays": {
    "ru": "Понедельник — Пятница",
    "uz": "Dushanba — Juma",
    "en": "Monday — Friday"
  },
  "weekend": {
    "ru": "Суббота — Воскресенье",
    "uz": "Shanba — Yakshanba",
    "en": "Saturday — Sunday"
  },
  "socialMedia": {
    "ru": "Социальные сети",
    "uz": "Ijtimoiy tarmoqlar",
    "en": "Social media"
  },
  "women": {
    "ru": "Женщинам",
    "uz": "Ayollar uchun",
    "en": "Women"
  },
  "newCollection": {
    "ru": "Новая коллекция",
    "uz": "Yangi kolleksiya",
    "en": "New collection"
  },
  "selectedForYou": {
    "ru": "Выбрано для вас",
    "uz": "Siz uchun tanlangan",
    "en": "Selected for you"
  },
  "newBadge": {
    "ru": "New",
    "uz": "Yangi",
    "en": "New"
  },
  "trousers": {
    "ru": "Брюки",
    "uz": "Shimlar",
    "en": "Trousers"
  },
  "shirts": {
    "ru": "Рубашки",
    "uz": "Koʻylaklar",
    "en": "Shirts"
  },
  "skirts": {
    "ru": "Юбки",
    "uz": "Yubkalar",
    "en": "Skirts"
  },
  "polo": {
    "ru": "Поло",
    "uz": "Polo",
    "en": "Polo shirts"
  },
  "jeans": {
    "ru": "Джинсы",
    "uz": "Jinsilar",
    "en": "Jeans"
  },
  "tshirts": {
    "ru": "Футболки",
    "uz": "Futbolkalar",
    "en": "T-shirts"
  },
  "tops": {
    "ru": "Топы",
    "uz": "Toplar",
    "en": "Tops"
  },
  "knitwear": {
    "ru": "Вязаная одежда",
    "uz": "Trikotaj kiyimlar",
    "en": "Knitwear"
  },
  "jewellery": {
    "ru": "Украшения",
    "uz": "Taqinchoqlar",
    "en": "Jewellery"
  },
  "scarves": {
    "ru": "Шарфы",
    "uz": "Sharf va roʻmollar",
    "en": "Scarves"
  },
  "heroSeason": {
    "ru": "ПРЕ-ФОЛЛ 2026",
    "uz": "PRE-FALL 2026",
    "en": "PRE-FALL 2026"
  },
  "heroCollection": {
    "ru": "НОВОЕ НАЧАЛО",
    "uz": "YANGI BOSQICH",
    "en": "THE RESET"
  },
  "heroShop": {
    "ru": "В КАТАЛОГ",
    "uz": "KATALOGGA O‘TISH",
    "en": "SHOP NOW"
  },
  "previousSlide": {
    "ru": "Предыдущий баннер",
    "uz": "Oldingi banner",
    "en": "Previous banner"
  },
  "nextSlide": {
    "ru": "Следующий баннер",
    "uz": "Keyingi banner",
    "en": "Next banner"
  },
  "Age": {
    "ru": "Возраст",
    "uz": "Yosh",
    "en": "Age"
  },
  "Gender": {
    "ru": "Пол",
    "uz": "Jins",
    "en": "Gender"
  },
  "Height": {
    "ru": "Рост",
    "uz": "Bo‘y",
    "en": "Height"
  },
  "Weight": {
    "ru": "Вес",
    "uz": "Vazn",
    "en": "Weight"
  },
  "Female": {
    "ru": "Женский",
    "uz": "Ayol",
    "en": "Female"
  },
  "Male": {
    "ru": "Мужской",
    "uz": "Erkak",
    "en": "Male"
  },
  "Prefer not to say": {
    "ru": "Не указывать",
    "uz": "Ko‘rsatmaslik",
    "en": "Prefer not to say"
  },
  "cm": {
    "ru": "см",
    "uz": "sm",
    "en": "cm"
  },
  "kg": {
    "ru": "кг",
    "uz": "kg",
    "en": "kg"
  },
  "cartTitle": {
    "ru": "Корзина",
    "uz": "Savat",
    "en": "Bag"
  },
  "yourBagCaps": {
    "ru": "ВАША КОРЗИНА",
    "uz": "SIZNING SAVATINGIZ",
    "en": "YOUR BAG"
  },
  "chestCm": {
    "ru": "Грудь, см",
    "uz": "Ko‘krak, sm",
    "en": "Chest, cm"
  },
  "waistCm": {
    "ru": "Талия, см",
    "uz": "Bel, sm",
    "en": "Waist, cm"
  },
  "hipsCm": {
    "ru": "Бёдра, см",
    "uz": "Son, sm",
    "en": "Hips, cm"
  },
  "footCm": {
    "ru": "Стопа, см",
    "uz": "Oyoq uzunligi, sm",
    "en": "Foot length, cm"
  },
  "diameterMm": {
    "ru": "Диаметр, мм",
    "uz": "Diametr, mm",
    "en": "Diameter, mm"
  },
  "finderTitle": {
    "ru": "Подберём ваш размер",
    "uz": "Sizga mos o‘lchamni topamiz",
    "en": "Find your size"
  },
  "finderLead": {
    "ru": "Заполните несколько параметров — это займёт меньше минуты.",
    "uz": "Bir nechta ma’lumotni kiriting — bu bir daqiqadan kam vaqt oladi.",
    "en": "Enter a few details — it takes less than a minute."
  },
  "finderPersonal": {
    "ru": "ПЕРСОНАЛЬНАЯ РЕКОМЕНДАЦИЯ",
    "uz": "SHAXSIY TAVSIYA",
    "en": "PERSONAL RECOMMENDATION"
  },
  "braTitle": {
    "ru": "Размер бюстгальтера",
    "uz": "Byustgalter o‘lchami",
    "en": "Bra size"
  },
  "braLead": {
    "ru": "Выберите размер для ещё более точной рекомендации.",
    "uz": "Yanada aniq tavsiya uchun o‘lchamingizni tanlang.",
    "en": "Choose your size for a more accurate recommendation."
  },
  "bandSize": {
    "ru": "Обхват под грудью",
    "uz": "Ko‘krak osti aylanasi",
    "en": "Band size"
  },
  "cupSize": {
    "ru": "Размер чашки",
    "uz": "Chashka o‘lchami",
    "en": "Cup size"
  },
  "fitTitle": {
    "ru": "Предпочтительная посадка",
    "uz": "Afzal ko‘rgan o‘tirish",
    "en": "Your preferred fit"
  },
  "fitLead": {
    "ru": "Выберите, как вам комфортнее носить одежду.",
    "uz": "Kiyim sizga qanday qulay turishini tanlang.",
    "en": "Choose how you prefer your clothes to fit."
  },
  "garmentFit": {
    "ru": "Посадка изделия",
    "uz": "Kiyim o‘tirishi",
    "en": "Garment fit"
  },
  "tighter": {
    "ru": "Более прилегающая",
    "uz": "Yopishiqroq",
    "en": "Tighter"
  },
  "average": {
    "ru": "Средняя",
    "uz": "O‘rtacha",
    "en": "Average"
  },
  "looser": {
    "ru": "Более свободная",
    "uz": "Erkinroq",
    "en": "Looser"
  },
  "fitAffects": {
    "ru": "Предпочтительная посадка влияет на рекомендуемый размер.",
    "uz": "Afzal o‘tirish tavsiya etilgan o‘lchamga ta’sir qiladi.",
    "en": "Your preferred fit affects the recommended size."
  },
  "recommendation": {
    "ru": "ВАША РЕКОМЕНДАЦИЯ",
    "uz": "SIZNING TAVSIYANGIZ",
    "en": "YOUR RECOMMENDATION"
  },
  "recommendedSize": {
    "ru": "Рекомендуемый размер",
    "uz": "Sizga tavsiya etilgan o‘lcham",
    "en": "Your recommended size"
  },
  "recommendedLead": {
    "ru": "С высокой вероятностью этот размер подойдёт вам.",
    "uz": "Bu o‘lcham sizga mos kelish ehtimoli yuqori.",
    "en": "There is a high chance this size will fit you well."
  },
  "editData": {
    "ru": "Изменить данные",
    "uz": "Ma’lumotlarni o‘zgartirish",
    "en": "Edit details"
  },
  "privacy": {
    "ru": "Данные сохраняются только в вашем браузере",
    "uz": "Ma’lumotlar faqat brauzeringizda saqlanadi",
    "en": "Your details are stored only in this browser"
  },
  "resetProfile": {
    "ru": "Сбросить профиль",
    "uz": "Profilni tiklash",
    "en": "Reset profile"
  },
  "shouldersTitle": {
    "ru": "Ваши плечи",
    "uz": "Yelkalaringiz",
    "en": "Your shoulders"
  },
  "shouldersLead": {
    "ru": "Укажите ширину плеч для более точной посадки",
    "uz": "Aniqroq o‘tirish uchun yelka kengligini tanlang",
    "en": "Choose your shoulder width for a more accurate fit."
  },
  "waistTitle": {
    "ru": "Ваша талия",
    "uz": "Belingiz",
    "en": "Your waist"
  },
  "waistLead": {
    "ru": "Выберите форму талии для более точной посадки",
    "uz": "Aniq tavsiya uchun bel shaklini tanlang",
    "en": "Choose your waist shape for a more accurate recommendation."
  },
  "hipsTitle": {
    "ru": "Бёдра и посадка",
    "uz": "Sonlar va o‘tirish",
    "en": "Your hips and thighs"
  },
  "hipsLead": {
    "ru": "Укажите форму бёдер для точной рекомендации",
    "uz": "Aniq tavsiya uchun son shaklini tanlang",
    "en": "Choose your hip shape for a more accurate recommendation."
  },
  "legsTitle": {
    "ru": "Длина ног",
    "uz": "Oyoq uzunligi",
    "en": "Your legs"
  },
  "legsLead": {
    "ru": "Это поможет подобрать правильную длину изделия",
    "uz": "Bu kiyimning to‘g‘ri uzunligini tanlashga yordam beradi",
    "en": "This helps us choose the right garment length."
  },
  "slim": {
    "ru": "Стройная",
    "uz": "Nozik",
    "en": "Slimmer"
  },
  "narrow": {
    "ru": "Узкие",
    "uz": "Tor",
    "en": "Narrower"
  },
  "medium": {
    "ru": "Средняя",
    "uz": "O‘rtacha",
    "en": "Average"
  },
  "wide": {
    "ru": "Широкая",
    "uz": "Keng",
    "en": "Wider"
  },
  "shorter": {
    "ru": "Короче",
    "uz": "Qisqaroq",
    "en": "Shorter"
  },
  "longer": {
    "ru": "Длиннее",
    "uz": "Uzunroq",
    "en": "Longer"
  },
  "euSizes": {
    "ru": "🇪🇺 Европейские размеры",
    "uz": "🇪🇺 Yevropa o‘lchamlari",
    "en": "🇪🇺 European sizes"
  },
  "usSizes": {
    "ru": "🇺🇸 Американские размеры",
    "uz": "🇺🇸 Amerika o‘lchamlari",
    "en": "🇺🇸 American sizes"
  },
  "auSizes": {
    "ru": "🇦🇺 Австралийские размеры",
    "uz": "🇦🇺 Avstraliya o‘lchamlari",
    "en": "🇦🇺 Australian sizes"
  },
  "beSizes": {
    "ru": "🇧🇪 Бельгийские размеры",
    "uz": "🇧🇪 Belgiya o‘lchamlari",
    "en": "🇧🇪 Belgian sizes"
  },
  "ukSizes": {
    "ru": "🇬🇧 Британские размеры",
    "uz": "🇬🇧 Britaniya o‘lchamlari",
    "en": "🇬🇧 British sizes"
  },
  "frSizes": {
    "ru": "🇫🇷 Французские размеры",
    "uz": "🇫🇷 Fransiya o‘lchamlari",
    "en": "🇫🇷 French sizes"
  },
  "itSizes": {
    "ru": "🇮🇹 Итальянские размеры",
    "uz": "🇮🇹 Italiya o‘lchamlari",
    "en": "🇮🇹 Italian sizes"
  },
  "esSizes": {
    "ru": "🇪🇸 Испанские размеры",
    "uz": "🇪🇸 Ispaniya o‘lchamlari",
    "en": "🇪🇸 Spanish sizes"
  }
};

/** Legacy info-page copy: lang → slug → [eyebrow, heading, body]. */
export const pageCopy: Record<Lang, Record<string, [string, string, string]>> = {
  "ru": {
    "about": [
      "О бренде",
      "Международная мода с узбекским акцентом!",
      "UMA объединяет искусство и дизайн, черпая вдохновение из культурного наследия Узбекистана. Каждая коллекция рассказывает свою историю."
    ],
    "delivery": [
      "Доставка",
      "Доставка по Узбекистану",
      "Срок и стоимость отображаются при оформлении. Заказы от 1 500 000 UZS доставляются бесплатно."
    ],
    "returns": [
      "Возврат",
      "Возврат и обмен",
      "Товар принимается к возврату в течение установленных сроков при сохранении первоначального состояния."
    ],
    "payment": [
      "Оплата",
      "Удобная оплата",
      "Uzcard, Humo, Visa и Mastercard."
    ],
    "contact": [
      "КОНТАКТЫ",
      "Мы рядом, когда это нужно.",
      "Поможем с выбором, оформлением заказа, доставкой, возвратом и сотрудничеством."
    ]
  },
  "uz": {
    "about": [
      "BRAND HAQIDA",
      "Oʻzbekona ruhdagi xalqaro moda",
      "UMA sanʼat va dizaynni Oʻzbekiston madaniy merosidan ilhomlanib birlashtiradi. Har bir kolleksiya oʻz hikoyasini soʻzlaydi."
    ],
    "delivery": [
      "YETKAZIB BERISH",
      "Oʻzbekiston bo‘ylab yetkazib berish",
      "Muddat va narx buyurtmani rasmiylashtirishda ko‘rsatiladi. 1 500 000 UZS dan yuqori buyurtmalar bepul yetkaziladi."
    ],
    "returns": [
      "QAYTARISH",
      "Qaytarish va almashtirish",
      "Mahsulot belgilangan muddat ichida dastlabki holati saqlangan bo‘lsa, qaytarish uchun qabul qilinadi."
    ],
    "payment": [
      "TOʻLOV",
      "Qulay toʻlov",
      "Uzcard, Humo, Visa va Mastercard."
    ],
    "contact": [
      "KONTAKTLAR",
      "Har doim yoningizdamiz",
      "Tanlash, buyurtma, yetkazish, qaytarish va hamkorlik bo‘yicha yordam beramiz."
    ]
  },
  "en": {
    "about": [
      "ABOUT UMA",
      "International fashion with an Uzbek accent",
      "UMA brings together art and design, drawing inspiration from the cultural heritage of Uzbekistan. Every collection tells its own story."
    ],
    "delivery": [
      "DELIVERY",
      "Delivery across Uzbekistan",
      "The delivery date and price are shown at checkout. Orders over 1,500,000 UZS receive free delivery."
    ],
    "returns": [
      "RETURNS",
      "Returns and exchanges",
      "Items can be returned within the stated period when kept in their original condition."
    ],
    "payment": [
      "PAYMENT",
      "Simple payment",
      "Uzcard, Humo, Visa and Mastercard."
    ],
    "contact": [
      "CONTACT",
      "We are here when you need us",
      "We can help with selecting items, ordering, delivery, returns and collaborations."
    ]
  }
};

export const commerce = { freeShipThreshold: 1500000, flatShipping: 35000 };

export const contact = {
  phone: '+998 90 054 34 08',
  email: 'umaclothingbrand@gmail.com',
  hoursWeekdays: '9:00\u201320:00',
  hoursWeekend: '11:00\u201318:00',
};

export const socialLinks = [
  {
    "label": "Instagram",
    "href": "https://www.instagram.com/uma_uz/"
  },
  {
    "label": "Telegram",
    "href": "https://t.me/uma_brand_uz"
  },
  {
    "label": "Facebook",
    "href": "https://www.facebook.com/profile.php?id=61574988260163"
  },
  {
    "label": "YouTube",
    "href": "https://www.youtube.com/@Uma_uz"
  },
  {
    "label": "Pinterest",
    "href": "https://www.pinterest.com/umaclothingbrand/"
  }
];

/**
 * 10 legacy categories; nameRu are the EXACT strings catalog predicates compare against.
 * nameUz/nameEn follow the legacy categoryName() mapping in App.jsx
 * (Платья→dresses, Брюки→trousers, Блузы→shirts, Юбки→skirts, Топы→tops,
 *  Жакеты→knitwear, Верхняя одежда→clothing, Аксессуары→accessories, Сумки→bags, Обувь→shoes).
 */
export const categories: { slug: string; nameRu: string; nameUz: string; nameEn: string }[] = [
  {
    "slug": "dresses",
    "nameRu": "Платья",
    "nameUz": "Koʻylaklar",
    "nameEn": "Dresses"
  },
  {
    "slug": "trousers",
    "nameRu": "Брюки",
    "nameUz": "Shimlar",
    "nameEn": "Trousers"
  },
  {
    "slug": "blouses",
    "nameRu": "Блузы",
    "nameUz": "Koʻylaklar",
    "nameEn": "Shirts"
  },
  {
    "slug": "skirts",
    "nameRu": "Юбки",
    "nameUz": "Yubkalar",
    "nameEn": "Skirts"
  },
  {
    "slug": "tops",
    "nameRu": "Топы",
    "nameUz": "Toplar",
    "nameEn": "Tops"
  },
  {
    "slug": "jackets",
    "nameRu": "Жакеты",
    "nameUz": "Trikotaj kiyimlar",
    "nameEn": "Knitwear"
  },
  {
    "slug": "outerwear",
    "nameRu": "Верхняя одежда",
    "nameUz": "Kiyimlar",
    "nameEn": "Clothing"
  },
  {
    "slug": "accessories",
    "nameRu": "Аксессуары",
    "nameUz": "Aksessuarlar",
    "nameEn": "Accessories"
  },
  {
    "slug": "bags",
    "nameRu": "Сумки",
    "nameUz": "Sumkalar",
    "nameEn": "Bags"
  },
  {
    "slug": "shoes",
    "nameRu": "Обувь",
    "nameUz": "Poyabzallar",
    "nameEn": "Shoes"
  }
];
