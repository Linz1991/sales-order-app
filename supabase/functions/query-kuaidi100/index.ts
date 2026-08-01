// Supabase Edge Function: 快递100 实时物流代理
// 作用：浏览器直连快递100 实时查询(poll)接口会被 CORS 拦截，且密钥不应下发前端。
//       本函数作为代理，密钥仅存于 Function Secrets（KUAIDI100_KEY / KUAIDI100_CUSTOMER）。
//
// 部署（需 Supabase CLI + 项目 service_role 权限）：
//   supabase functions deploy query-kuaidi100 --project-ref mfimcrzewhnlbtkjgqlq
//   supabase secrets set KUAIDI100_KEY=QmKYUltj4320 KUAIDI100_CUSTOMER=<完整授权码> --project-ref mfimcrzewhnlbtkjgqlq
//
// 前端已在代码中自动拼接代理地址：
//   https://mfimcrzewhnlbtkjgqlq.functions.supabase.co/query-kuaidi100?num=运单号&com=公司编码

// ===== 内联 MD5（避免依赖外部远程模块，保证可离线打包） =====
function md5(input: string): string {
  function rotateLeft(lValue: number, iShiftBits: number): number {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function addUnsigned(lX: number, lY: number): number {
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX8 | lY8) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    }
    return lResult ^ lX8 ^ lY8;
  }
  function F(x: number, y: number, z: number): number { return (x & y) | (~x & z); }
  function G(x: number, y: number, z: number): number { return (x & z) | (y & ~z); }
  function H(x: number, y: number, z: number): number { return x ^ y ^ z; }
  function I(x: number, y: number, z: number): number { return y ^ (x | ~z); }
  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function convertToWordArray(str: string): number[] {
    const lWordCount = str.length >> 2;
    const lMessageLength = str.length;
    const lWordArray: number[] = new Array(lWordCount + 1);
    for (let i = 0; i < lWordCount + 1; i++) lWordArray[i] = 0;
    for (let i = 0; i < lMessageLength; i++) {
      lWordArray[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
    }
    lWordArray[lWordCount] |= 0x80 << ((lMessageLength % 4) * 8);
    lWordArray[lWordCount + 1] = lMessageLength << 3;
    return lWordArray;
  }
  function wordToHex(lValue: number): string {
    let word = "";
    for (let i = 0; i <= 3; i++) {
      const byte = (lValue >>> (i * 8)) & 255;
      word += ("0" + byte.toString(16)).slice(-2);
    }
    return word;
  }
  function utf8Encode(str: string): string {
    str = str.replace(/\r\n/g, "\n");
    let utftext = "";
    for (let n = 0; n < str.length; n++) {
      const c = str.charCodeAt(n);
      if (c < 128) utftext += String.fromCharCode(c);
      else if (c > 127 && c < 2048) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  }

  const x = convertToWordArray(utf8Encode(input));
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k + 0], 7, 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1], 12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], 17, 0x242070db);
    b = FF(b, c, d, a, x[k + 3], 22, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], 7, 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5], 12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], 17, 0xa8304613);
    b = FF(b, c, d, a, x[k + 7], 22, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], 7, 0x698098d8);
    d = FF(d, a, b, c, x[k + 9], 12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], 17, 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11], 22, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], 7, 0x6b901122);
    d = FF(d, a, b, c, x[k + 13], 12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], 17, 0xa679438e);
    b = FF(b, c, d, a, x[k + 15], 22, 0x49b40821);

    a = GG(a, b, c, d, x[k + 1], 5, 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6], 9, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], 14, 0x265e5a51);
    b = GG(b, c, d, a, x[k + 0], 20, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], 5, 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10], 9, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], 14, 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], 5, 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14], 9, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], 14, 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8], 20, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], 5, 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2], 9, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], 14, 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a);

    a = HH(a, b, c, d, x[k + 5], 4, 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8], 11, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], 16, 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14], 23, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], 4, 0xa4beea44);
    d = HH(d, a, b, c, x[k + 4], 11, 0xf6bb4b60);
    c = HH(c, d, a, b, x[k + 7], 16, 0xbebfbc70);
    b = HH(b, c, d, a, x[k + 10], 23, 0x289b7ec6);
    a = HH(a, b, c, d, x[k + 13], 4, 0xeaa127fa);
    d = HH(d, a, b, c, x[k + 0], 11, 0xd4ef3085);
    c = HH(c, d, a, b, x[k + 3], 16, 0x04881d05);
    b = HH(b, c, d, a, x[k + 6], 23, 0xd9d4d039);
    a = HH(a, b, c, d, x[k + 9], 4, 0xe6db99e5);
    d = HH(d, a, b, c, x[k + 12], 11, 0x1fa27cf8);
    c = HH(c, d, a, b, x[k + 15], 16, 0xc4ac5665);
    b = HH(b, c, d, a, x[k + 2], 23, 0xf4292244);

    a = II(a, b, c, d, x[k + 0], 6, 0xf4292244);
    d = II(d, a, b, c, x[k + 7], 10, 0x432aff97);
    c = II(c, d, a, b, x[k + 14], 15, 0xab9423a7);
    b = II(b, c, d, a, x[k + 5], 21, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], 6, 0x655b59c3);
    d = II(d, a, b, c, x[k + 3], 10, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], 15, 0xffeff47d);
    b = II(b, c, d, a, x[k + 1], 21, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], 6, 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15], 10, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], 15, 0xa3014314);
    b = II(b, c, d, a, x[k + 13], 21, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], 6, 0xf7537e82);
    d = II(d, a, b, c, x[k + 11], 10, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], 15, 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9], 21, 0xeb86d391);

    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

const KUAIDI100_KEY = Deno.env.get("KUAIDI100_KEY") || "QmKYUltj4320";
const KUAIDI100_CUSTOMER = Deno.env.get("KUAIDI100_CUSTOMER") || "";

// 快递100 实时查询签名：MD5(param + key + customer) 转大写
function sign(param: string): string {
  return md5(param + KUAIDI100_KEY + KUAIDI100_CUSTOMER).toUpperCase();
}

export async function handler(req: Request): Promise<Response> {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const url = new URL(req.url);
    const num = (url.searchParams.get("num") || "").trim();
    const com = (url.searchParams.get("com") || "").trim();
    if (!num) {
      return new Response(JSON.stringify({ status: "400", message: "缺少运单号 num" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!KUAIDI100_CUSTOMER) {
      return new Response(
        JSON.stringify({ status: "401", message: "服务端未配置 KUAIDI100_CUSTOMER 授权码（请在 Supabase Function Secrets 中设置）" }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // 实时查询接口入参
    const param = JSON.stringify({ com, num, from: "", to: "" });
    const s = sign(param);

    const body = new URLSearchParams();
    body.set("customer", KUAIDI100_CUSTOMER);
    body.set("sign", s);
    body.set("param", param);

    const resp = await fetch("https://poll.kuaidi100.com/poll/query.do", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const text = await resp.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = { status: "500", message: text || "快递100 返回非 JSON" };
    }
    return new Response(JSON.stringify(json), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ status: "500", message: String(e) }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}
