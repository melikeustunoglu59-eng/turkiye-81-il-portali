require('dotenv').config({
    path: '../.env',
    override: true
});

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const multer = require('multer');
const XLSX = require('xlsx');
const { Pool } = require('pg');

const app = express();

app.use(cors());
app.use(express.json());

const excelUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const name = String(file.originalname || '').toLowerCase();

        if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
            cb(null, true);
        } else {
            cb(new Error('Sadece .xlsx veya .xls Excel dosyaları yüklenebilir.'));
        }
    }
});

const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    })
    : new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'turkiye_veri_portali',
        password: process.env.DB_PASSWORD || '',
        port: Number(process.env.DB_PORT || 5432),
    });

// -----------------------------------------------------
// YÖNETİCİ AYARLARI
// -----------------------------------------------------

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const ADMIN_TOKEN_SURESI_MS =
    1000 * 60 * 60 * 8; // 8 saat


// -----------------------------------------------------
// VERİTABANI BAĞLANTI TESTİ
// -----------------------------------------------------

pool.connect()
    .then(client => {
        console.log('Veri tabanına başarıyla bağlandık! 🚀');
        client.release();
    })
    .catch(err => {
        console.error(
            'Veri tabanı bağlantı hatası:',
            err
        );
    });


// -----------------------------------------------------
// NORMAL API
// -----------------------------------------------------

// Kategori + başlık + yıl listesini getirir
app.get('/api/veri-metadata', async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT DISTINCT
                kategori,
                baslik,
                yil
            FROM turkiye_verileri
            WHERE kategori IS NOT NULL
              AND baslik IS NOT NULL
              AND yil IS NOT NULL
            ORDER BY kategori, baslik, yil DESC
        `);

        res.json(result.rows);

    } catch (err) {

        console.error(
            'Metadata SQL Hatası:',
            err.message
        );

        res.status(500).json({
            error: 'Metadata alınamadı.',
            detail: err.message
        });
    }
});


// Seçilen kategori + başlık + yıl verilerini getirir
app.get('/api/veriler', async (req, res) => {

    try {

        const {
            kategori,
            baslik,
            yil
        } = req.query;

        console.log('Gelen filtre:', {
            kategori,
            baslik,
            yil
        });

        const result = await pool.query(`
            SELECT *
            FROM turkiye_verileri
            WHERE LOWER(TRIM(kategori)) = LOWER(TRIM($1))
              AND LOWER(TRIM(baslik)) = LOWER(TRIM($2))
              AND CAST(yil AS TEXT) = TRIM($3)
        `, [
            kategori,
            baslik,
            yil
        ]);

        console.log(
            `Bulunan kayıt sayısı: ${result.rows.length}`
        );

        res.json(result.rows);

    } catch (err) {

        console.error(
            'SQL Hatası Detayı:',
            err.message
        );

        res.status(500).send(
            'Sunucu Hatası: ' + err.message
        );
    }
});


// -----------------------------------------------------
// EXCEL YARDIMCI FONKSİYONLARI
// -----------------------------------------------------

const excelBaslikTemizle = (deger) => {

    return String(deger ?? '')
        .trim()
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/İ/g, 'i')
        .replace(/[^a-z0-9]/g, '');
};


const excelMetin = (deger) => {

    if (
        deger === null ||
        deger === undefined
    ) {
        return '';
    }

    return String(deger).trim();
};


const excelSayi = (deger) => {

    if (typeof deger === 'number') {
        return deger;
    }

    const metin = String(deger ?? '')
        .replace(/\s/g, '')
        .replace(',', '.')
        .trim();

    if (!metin) {
        return null;
    }

    const sayi = Number(metin);

    return Number.isFinite(sayi)
        ? sayi
        : null;
};


const excelKolonBul = (harita, adaylar) => {

    for (const aday of adaylar) {

        const anahtar =
            excelBaslikTemizle(aday);

        if (harita.has(anahtar)) {
            return harita.get(anahtar);
        }
    }

    return null;
};


// -----------------------------------------------------
// YÖNETİCİ TOKEN SİSTEMİ
// -----------------------------------------------------

const signToken = (
    username,
    issuedAt
) => {

    const payload =
        `${username}|${issuedAt}`;

    const signature =
        crypto
            .createHmac(
                'sha256',
                ADMIN_SECRET
            )
            .update(payload)
            .digest('hex');

    return Buffer
        .from(
            `${payload}|${signature}`
        )
        .toString('base64url');
};


const verifyToken = (token) => {

    try {

        const decoded =
            Buffer
                .from(
                    token,
                    'base64url'
                )
                .toString('utf8');

        const parts =
            decoded.split('|');

        if (parts.length !== 3) {
            return false;
        }

        const [
            username,
            issuedAtText,
            signature
        ] = parts;

        const issuedAt =
            Number(issuedAtText);

        if (
            !username ||
            !Number.isFinite(issuedAt)
        ) {
            return false;
        }

        if (
            Date.now() - issuedAt >
            ADMIN_TOKEN_SURESI_MS
        ) {
            return false;
        }

        const expected =
            crypto
                .createHmac(
                    'sha256',
                    ADMIN_SECRET
                )
                .update(
                    `${username}|${issuedAt}`
                )
                .digest('hex');

        return (
            crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expected)
            )
            &&
            username === ADMIN_USERNAME
        );

    } catch {

        return false;
    }
};


const adminAuth = (
    req,
    res,
    next
) => {

    const auth =
        req.headers.authorization || '';

    const token =
        auth.startsWith('Bearer ')
            ? auth.slice(7)
            : '';

    if (
        !token ||
        !verifyToken(token)
    ) {

        return res.status(401).json({
            error: 'Yetkisiz erişim.'
        });
    }

    next();
};


// -----------------------------------------------------
// YÖNETİCİ GİRİŞİ
// -----------------------------------------------------

app.post(
    '/api/admin/login',
    (req, res) => {

        const {
            kullaniciAdi,
            sifre
        } = req.body || {};

        if (
            kullaniciAdi !==
            ADMIN_USERNAME ||
            sifre !==
            ADMIN_PASSWORD
        ) {

            return res.status(401).json({
                error:
                    'Kullanıcı adı veya şifre hatalı.'
            });
        }

        const token =
            signToken(
                ADMIN_USERNAME,
                Date.now()
            );

        res.json({
            token
        });
    }
);


// -----------------------------------------------------
// YÖNETİCİ VERİ LİSTELEME
// -----------------------------------------------------

app.get(
    '/api/admin/veriler',
    adminAuth,
    async (req, res) => {

        try {

            const arama =
                String(
                    req.query.arama || ''
                ).trim();

            let result;

            if (arama) {

                result =
                    await pool.query(`
                        SELECT *
                        FROM turkiye_verileri
                        WHERE
                            CAST(id AS TEXT)
                            ILIKE $1

                            OR COALESCE(il, '')
                            ILIKE $1

                            OR COALESCE(kategori, '')
                            ILIKE $1

                            OR COALESCE(baslik, '')
                            ILIKE $1

                        ORDER BY id DESC
                        LIMIT 500
                    `, [
                        `%${arama}%`
                    ]);

            } else {

                result =
                    await pool.query(`
                        SELECT *
                        FROM turkiye_verileri
                        ORDER BY id DESC
                        LIMIT 500
                    `);
            }

            res.json(result.rows);

        } catch (err) {

            console.error(
                'Admin listeleme hatası:',
                err.message
            );

            res.status(500).json({
                error:
                    'Veriler alınamadı.',
                detail:
                    err.message
            });
        }
    }
);


// -----------------------------------------------------
// YENİ VERİ EKLEME
// -----------------------------------------------------

app.post(
    '/api/admin/veriler',
    adminAuth,
    async (req, res) => {

        try {

            const {
                il,
                duzey1_kod,
                duzey2_kod,
                baslik,
                kategori,
                yil,
                deger
            } = req.body || {};

            if (
                !il ||
                !baslik ||
                !kategori ||
                !Number.isFinite(
                    Number(yil)
                ) ||
                !Number.isFinite(
                    Number(deger)
                )
            ) {

                return res.status(400).json({
                    error:
                        'İl, kategori, başlık, yıl ve değer zorunludur.'
                });
            }

            const result =
                await pool.query(`
                    INSERT INTO turkiye_verileri
                        (
                            il,
                            duzey1_kod,
                            duzey2_kod,
                            baslik,
                            kategori,
                            yil,
                            deger
                        )
                    VALUES
                        (
                            $1,
                            $2,
                            $3,
                            $4,
                            $5,
                            $6,
                            $7
                        )
                    RETURNING *
                `, [

                    String(il).trim(),

                    duzey1_kod
                        ? String(
                            duzey1_kod
                        ).trim()
                        : null,

                    duzey2_kod
                        ? String(
                            duzey2_kod
                        ).trim()
                        : null,

                    String(
                        baslik
                    ).trim(),

                    String(
                        kategori
                    ).trim(),

                    Number(yil),

                    Number(deger)
                ]);

            res.status(201).json(
                result.rows[0]
            );

        } catch (err) {

            console.error(
                'Admin ekleme hatası:',
                err.message
            );

            res.status(500).json({
                error:
                    'Veri eklenemedi.',
                detail:
                    err.message
            });
        }
    }
);


// -----------------------------------------------------
// VERİ GÜNCELLEME
// -----------------------------------------------------

app.put(
    '/api/admin/veriler/:id',
    adminAuth,
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);

            if (
                !Number.isInteger(id)
            ) {

                return res.status(400).json({
                    error:
                        'Geçersiz kayıt ID.'
                });
            }

            const {
                il,
                duzey1_kod,
                duzey2_kod,
                baslik,
                kategori,
                yil,
                deger
            } = req.body || {};

            if (
                !il ||
                !baslik ||
                !kategori ||
                !Number.isFinite(
                    Number(yil)
                ) ||
                !Number.isFinite(
                    Number(deger)
                )
            ) {

                return res.status(400).json({
                    error:
                        'İl, kategori, başlık, yıl ve değer zorunludur.'
                });
            }

            const result =
                await pool.query(`
                    UPDATE turkiye_verileri
                    SET
                        il = $1,
                        duzey1_kod = $2,
                        duzey2_kod = $3,
                        baslik = $4,
                        kategori = $5,
                        yil = $6,
                        deger = $7
                    WHERE id = $8
                    RETURNING *
                `, [

                    String(il).trim(),

                    duzey1_kod
                        ? String(
                            duzey1_kod
                        ).trim()
                        : null,

                    duzey2_kod
                        ? String(
                            duzey2_kod
                        ).trim()
                        : null,

                    String(
                        baslik
                    ).trim(),

                    String(
                        kategori
                    ).trim(),

                    Number(yil),

                    Number(deger),

                    id
                ]);

            if (
                result.rowCount === 0
            ) {

                return res.status(404).json({
                    error:
                        'Kayıt bulunamadı.'
                });
            }

            res.json(
                result.rows[0]
            );

        } catch (err) {

            console.error(
                'Admin güncelleme hatası:',
                err.message
            );

            res.status(500).json({
                error:
                    'Veri güncellenemedi.',
                detail:
                    err.message
            });
        }
    }
);


// -----------------------------------------------------
// VERİ SİLME
// -----------------------------------------------------

app.delete(
    '/api/admin/veriler/:id',
    adminAuth,
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);

            if (
                !Number.isInteger(id)
            ) {

                return res.status(400).json({
                    error:
                        'Geçersiz kayıt ID.'
                });
            }

            const result =
                await pool.query(`
                    DELETE FROM turkiye_verileri
                    WHERE id = $1
                    RETURNING id
                `, [
                    id
                ]);

            if (
                result.rowCount === 0
            ) {

                return res.status(404).json({
                    error:
                        'Kayıt bulunamadı.'
                });
            }

            res.json({
                success: true,
                id:
                    result.rows[0].id
            });

        } catch (err) {

            console.error(
                'Admin silme hatası:',
                err.message
            );

            res.status(500).json({
                error:
                    'Veri silinemedi.',
                detail:
                    err.message
            });
        }
    }
);


// -----------------------------------------------------
// EXCEL İLE TOPLU VERİ YÜKLEME
// -----------------------------------------------------

app.post(
    '/api/admin/excel-yukle',
    adminAuth,
    (req, res) => {

        excelUpload.single('dosya')(
            req,
            res,
            async (uploadErr) => {

                if (uploadErr) {

                    return res.status(400).json({
                        error:
                            uploadErr.message ||
                            'Excel dosyası yüklenemedi.'
                    });
                }

                if (!req.file) {

                    return res.status(400).json({
                        error:
                            'Lütfen bir Excel dosyası seçin.'
                    });
                }


                try {

                    // Excel'i bellekte oku
                    const workbook =
                        XLSX.read(
                            req.file.buffer,
                            {
                                type: 'buffer',
                                cellDates: false
                            }
                        );


                    const ilkSayfa =
                        workbook.SheetNames[0];


                    if (!ilkSayfa) {

                        return res.status(400).json({
                            error:
                                'Excel dosyasında okunabilir çalışma sayfası bulunamadı.'
                        });
                    }


                    const satirlar =
                        XLSX.utils.sheet_to_json(
                            workbook.Sheets[ilkSayfa],
                            {
                                defval: '',
                                raw: true
                            }
                        );


                    if (!satirlar.length) {

                        return res.status(400).json({
                            error:
                                'Excel dosyasında veri bulunamadı.'
                        });
                    }


                    // Excel sütun isimlerini bul
                    const kolonHaritasi =
                        new Map(
                            Object.keys(
                                satirlar[0]
                            ).map(kolon => [
                                excelBaslikTemizle(
                                    kolon
                                ),
                                kolon
                            ])
                        );


                    const kol_il =
                        excelKolonBul(
                            kolonHaritasi,
                            ['il']
                        );


                    const kol_d1 =
                        excelKolonBul(
                            kolonHaritasi,
                            [
                                'duzey1_kod',
                                'duzey1 kodu',
                                'duzey1'
                            ]
                        );


                    const kol_d2 =
                        excelKolonBul(
                            kolonHaritasi,
                            [
                                'duzey2_kod',
                                'duzey2 kodu',
                                'duzey2'
                            ]
                        );


                    const kol_baslik =
                        excelKolonBul(
                            kolonHaritasi,
                            [
                                'baslik',
                                'başlık'
                            ]
                        );


                    const kol_kategori =
                        excelKolonBul(
                            kolonHaritasi,
                            [
                                'kategori'
                            ]
                        );


                    const kol_yil =
                        excelKolonBul(
                            kolonHaritasi,
                            [
                                'yil',
                                'yıl'
                            ]
                        );


                    const kol_deger =
                        excelKolonBul(
                            kolonHaritasi,
                            [
                                'deger',
                                'değer'
                            ]
                        );


                    const kol_location =
                        excelKolonBul(
                            kolonHaritasi,
                            [
                                'location_code',
                                'location code'
                            ]
                        );


                    const kol_kod =
                        excelKolonBul(
                            kolonHaritasi,
                            [
                                'kod'
                            ]
                        );


                    // Gerekli sütun kontrolü
                    const eksik = [];


                    if (!kol_il) {
                        eksik.push('il');
                    }


                    if (!kol_baslik) {
                        eksik.push('baslik');
                    }


                    if (!kol_kategori) {
                        eksik.push('kategori');
                    }


                    if (!kol_yil) {
                        eksik.push('yil');
                    }


                    if (!kol_deger) {
                        eksik.push('deger');
                    }


                    if (eksik.length) {

                        return res.status(400).json({
                            error:
                                `Gerekli sütunlar eksik: ${eksik.join(', ')}.`
                        });
                    }


                    const temizSatirlar = [];
                    const hatalar = [];


                    // Excel satırlarını temizle
                    satirlar.forEach(
                        (satir, index) => {

                            const satirNo =
                                index + 2;


                            const il =
                                excelMetin(
                                    satir[kol_il]
                                );


                            const baslik =
                                excelMetin(
                                    satir[kol_baslik]
                                );


                            const kategori =
                                excelMetin(
                                    satir[kol_kategori]
                                );


                            const yil =
                                excelSayi(
                                    satir[kol_yil]
                                );


                            const deger =
                                excelSayi(
                                    satir[kol_deger]
                                );


                            let duzey1_kod =
                                kol_d1
                                    ? excelMetin(
                                        satir[
                                            kol_d1
                                        ]
                                    )
                                    : '';


                            let duzey2_kod =
                                kol_d2
                                    ? excelMetin(
                                        satir[
                                            kol_d2
                                        ]
                                    )
                                    : '';


                            // location_code'dan Düzey 2 kodu
                            if (
                                !duzey2_kod &&
                                kol_location
                            ) {

                                const location =
                                    excelMetin(
                                        satir[
                                            kol_location
                                        ]
                                    );


                                if (
                                    /^TR(?:[0-9]{2}|[ABC][0-9])$/i.test(
                                        location
                                    )
                                ) {

                                    duzey2_kod =
                                        location.toUpperCase();
                                }
                            }


                            // kod sütunundan Düzey 2 kodu
                            if (
                                !duzey2_kod &&
                                kol_kod
                            ) {

                                const kod =
                                    excelMetin(
                                        satir[
                                            kol_kod
                                        ]
                                    );


                                if (
                                    /^TR(?:[0-9]{2}|[ABC][0-9])$/i.test(
                                        kod
                                    )
                                ) {

                                    duzey2_kod =
                                        kod.toUpperCase();
                                }
                            }


                            // Düzey 2 varsa Düzey 1'i otomatik üret
                            if (
                                !duzey1_kod &&
                                duzey2_kod
                            ) {

                                duzey1_kod =
                                    duzey2_kod
                                        .slice(0, 3)
                                        .toUpperCase();
                            }


                            // Satır geçerli mi?
                            if (
                                !il ||
                                !baslik ||
                                !kategori ||
                                !Number.isInteger(
                                    Number(yil)
                                ) ||
                                deger === null
                            ) {

                                hatalar.push(
                                    `Excel ${satirNo}. satır atlandı.`
                                );

                                return;
                            }


                            temizSatirlar.push({
                                il,
                                duzey1_kod:
                                    duzey1_kod ||
                                    null,
                                duzey2_kod:
                                    duzey2_kod ||
                                    null,
                                baslik,
                                kategori,
                                yil:
                                    Number(yil),
                                deger
                            });
                        }
                    );


                    if (
                        !temizSatirlar.length
                    ) {

                        return res.status(400).json({
                            error:
                                'Excel içindeki geçerli veri satırı bulunamadı.',
                            atlanan:
                                hatalar.length
                        });
                    }


                    // Transaction başlat
                    const client =
                        await pool.connect();


                    let guncellenen = 0;
                    let eklenen = 0;


                    try {

                        await client.query(
                            'BEGIN'
                        );


                        // Geçici tablo oluştur
                        await client.query(`
                            CREATE TEMP TABLE excel_yukleme (
                                il TEXT NOT NULL,
                                duzey1_kod TEXT,
                                duzey2_kod TEXT,
                                baslik TEXT NOT NULL,
                                kategori TEXT NOT NULL,
                                yil INTEGER NOT NULL,
                                deger NUMERIC NOT NULL
                            ) ON COMMIT DROP
                        `);


                        // Excel verilerini geçici tabloya ekle
                        const batchBoyutu =
                            1000;


                        for (
                            let baslangic = 0;
                            baslangic <
                            temizSatirlar.length;
                            baslangic +=
                                batchBoyutu
                        ) {

                            const parca =
                                temizSatirlar.slice(
                                    baslangic,
                                    baslangic +
                                        batchBoyutu
                                );


                            const degerler = [];
                            const placeholders = [];


                            parca.forEach(
                                (
                                    satir,
                                    index
                                ) => {

                                    const o =
                                        index * 7;


                                    degerler.push(
                                        satir.il,
                                        satir.duzey1_kod,
                                        satir.duzey2_kod,
                                        satir.baslik,
                                        satir.kategori,
                                        satir.yil,
                                        satir.deger
                                    );


                                    placeholders.push(
                                        `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7})`
                                    );
                                }
                            );


                            await client.query(
                                `
                                    INSERT INTO excel_yukleme
                                        (
                                            il,
                                            duzey1_kod,
                                            duzey2_kod,
                                            baslik,
                                            kategori,
                                            yil,
                                            deger
                                        )
                                    VALUES
                                        ${placeholders.join(', ')}
                                `,
                                degerler
                            );
                        }


                        // Mevcut kayıtları güncelle
                        const updateResult =
                            await client.query(`
                                UPDATE turkiye_verileri AS hedef
                                SET
                                    duzey1_kod =
                                        kaynak.duzey1_kod,

                                    duzey2_kod =
                                        kaynak.duzey2_kod,

                                    deger =
                                        kaynak.deger

                                FROM excel_yukleme AS kaynak

                                WHERE
                                    LOWER(
                                        TRIM(
                                            hedef.il
                                        )
                                    )
                                    =
                                    LOWER(
                                        TRIM(
                                            kaynak.il
                                        )
                                    )

                                    AND

                                    LOWER(
                                        TRIM(
                                            hedef.baslik
                                        )
                                    )
                                    =
                                    LOWER(
                                        TRIM(
                                            kaynak.baslik
                                        )
                                    )

                                    AND

                                    LOWER(
                                        TRIM(
                                            hedef.kategori
                                        )
                                    )
                                    =
                                    LOWER(
                                        TRIM(
                                            kaynak.kategori
                                        )
                                    )

                                    AND

                                    hedef.yil =
                                        kaynak.yil
                            `);


                        guncellenen =
                            updateResult.rowCount;


                        // Yeni kayıtları ekle
                        const insertResult =
                            await client.query(`
                                INSERT INTO turkiye_verileri
                                    (
                                        il,
                                        duzey1_kod,
                                        duzey2_kod,
                                        baslik,
                                        kategori,
                                        yil,
                                        deger
                                    )

                                SELECT
                                    kaynak.il,
                                    kaynak.duzey1_kod,
                                    kaynak.duzey2_kod,
                                    kaynak.baslik,
                                    kaynak.kategori,
                                    kaynak.yil,
                                    kaynak.deger

                                FROM excel_yukleme
                                    AS kaynak

                                WHERE NOT EXISTS (

                                    SELECT 1

                                    FROM turkiye_verileri
                                        AS hedef

                                    WHERE
                                        LOWER(
                                            TRIM(
                                                hedef.il
                                            )
                                        )
                                        =
                                        LOWER(
                                            TRIM(
                                                kaynak.il
                                            )
                                        )

                                        AND

                                        LOWER(
                                            TRIM(
                                                hedef.baslik
                                            )
                                        )
                                        =
                                        LOWER(
                                            TRIM(
                                                kaynak.baslik
                                            )
                                        )

                                        AND

                                        LOWER(
                                            TRIM(
                                                hedef.kategori
                                            )
                                        )
                                        =
                                        LOWER(
                                            TRIM(
                                                kaynak.kategori
                                            )
                                        )

                                        AND

                                        hedef.yil =
                                            kaynak.yil
                                )
                            `);


                        eklenen =
                            insertResult.rowCount;


                        // Her şey başarılıysa kaydet
                        await client.query(
                            'COMMIT'
                        );

                    } catch (dbErr) {

                        await client.query(
                            'ROLLBACK'
                        );

                        throw dbErr;

                    } finally {

                        client.release();
                    }


                    res.json({
                        success: true,

                        guncellenen,

                        eklenen,

                        atlanan:
                            hatalar.length,

                        toplamSatir:
                            satirlar.length,

                        gecenSatir:
                            temizSatirlar.length,

                        hatalar:
                            hatalar.slice(
                                0,
                                20
                            )
                    });


                } catch (err) {

                    console.error(
                        'Excel yükleme hatası:',
                        err.message
                    );

                    res.status(500).json({
                        error:
                            'Excel işlenemedi.',
                        detail:
                            err.message
                    });
                }
            }
        );
    }
);


// -----------------------------------------------------
// SUNUCU
// -----------------------------------------------------

const PORT = 5000;

app.listen(
    PORT,
    () => {

        console.log(
            `Sunucu ${PORT} portunda başarıyla çalışıyor! 🚀`
        );

        console.log(
            `Yönetici kullanıcı adı: ${ADMIN_USERNAME}`
        );

        console.log(
            'Yönetici şifresi ortam değişkeninden ayarlanabilir.'
        );
    }
);