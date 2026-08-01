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

import { Md5 } from "https://deno.land/std@0.190.0/hash/md5.ts";

const KUAIDI100_KEY = Deno.env.get("KUAIDI100_KEY") || "QmKYUltj4320";
const KUAIDI100_CUSTOMER = Deno.env.get("KUAIDI100_CUSTOMER") || "";

// 快递100 实时查询签名：MD5(param + key + customer) 转大写
function sign(param: string): string {
  const md5 = new Md5();
  md5.update(param + KUAIDI100_KEY + KUAIDI100_CUSTOMER);
  return md5.toString().toUpperCase();
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
