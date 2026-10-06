// Focused application tests: no external database or payment requests.
// Run: node --test scripts/storefront-integration.test.cjs
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const nativeFetch = global.fetch;
beforeEach(() => { global.fetch = async (url) => { throw new Error(`Unmocked request blocked: ${url}`); }; });
afterEach(() => { global.fetch = nativeFetch; });

function load(entry, mocks = {}) {
  const cache = new Map();
  function read(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText;
    function localRequire(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === 'server-only') return {};
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(filename), name);
        const alias = '@/'+path.relative(root,base).replaceAll(path.sep,'/');
        if (Object.hasOwn(mocks,alias)) return mocks[alias];
        const file = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')].find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
        if (!file) throw new Error(`Missing module ${name}`);
        return read(file);
      }
      return require(name);
    }
    new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
    return module.exports;
  }
  return read(path.join(root, entry));
}
const products = load('lib/products.ts');
const cart = load('lib/cart.ts');
const shipping = load('lib/shipping.ts');
const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const ORDER_ID = '22222222-2222-4222-8222-222222222222';
const REFERENCE = '33333333-3333-4333-8333-333333333333';
const TOKEN = 'test-access-token-with-at-least-32-characters';
function product(overrides = {}) {
  return { id: PRODUCT_ID, name: 'Product A', slug: 'product-a', status: 'active', active: true,
    stock_quantity: 5, price_150g: 1, price_400g: 2, origin: 'Korea', display_order: 0, discovery_tags: [],
    variants: [{ id: 'small', size: '150g', price: 19000, salePrice: 13000, stock: 3, available: true },
      { id: 'large', size: '400g', price: 44000, salePrice: 29000, stock: 2, available: true }], ...overrides };
}
function line(p = product(), weight = '150g', grind = 'Whole Bean', quantity = 1) {
  const variant = p.variants.find((v) => v.size === weight);
  return { product: p, variantId: variant.id, weight, grind, quantity, unitPrice: variant.salePrice ?? variant.price };
}
const Link = ({ children, ...props }) => React.createElement('a', props, children);
const uiMocks = { 'next/link': { __esModule:true, default: Link }, 'next/script': { __esModule:true, default: () => null } };
function elements(tree) {
  if (Array.isArray(tree)) return tree.flatMap(elements);
  if (!tree || typeof tree !== 'object' || !tree.props) return [];
  return [tree, ...elements(tree.props.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (tree == null || typeof tree === 'boolean') return '';
  return typeof tree === 'object' ? text(tree.props?.children) : String(tree);
}
// A small deterministic hook harness exercises existing component callbacks/effects,
// without adding a browser or E2E framework to this repository.
function hooks() {
  const slots = []; let cursor = 0; let pending = [];
  const equal = (a,b) => a && b && a.length === b.length && a.every((v,i) => Object.is(v,b[i]));
  const api = { ...React,
    useState(initial) { const i = cursor++; if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, (next) => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useMemo(fn, deps) { const i = cursor++; if (!slots[i] || !equal(slots[i].deps, deps)) slots[i] = { value: fn(), deps }; return slots[i].value; },
    useCallback(fn, deps) { return api.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || !equal(slots[i].deps, deps)) {
      slots[i]?.cleanup?.(); slots[i] = { deps }; pending.push(() => { slots[i].cleanup = fn(); });
    } },
  };
  return { api, render(fn) { cursor = 0; return fn(); }, async effects() { const current = pending; pending = []; current.forEach((fn) => fn()); await new Promise(setImmediate); } };
}
function storage() { const values = new Map(); return { getItem: (key) => values.get(key) ?? null, setItem: (key,v) => values.set(key,String(v)), removeItem: (key) => values.delete(key) }; }

test('shared 150g inventory permits 1 Whole Bean + 2 Filter, blocks Espresso and size overflow', () => {
  const p = product(); let items = cart.addCartItem([], line(p));
  items = cart.addCartItem(items, line(p, '150g', 'Filter', 2));
  assert.equal(items.reduce((n,i) => n+i.quantity,0),3);
  assert.equal(cart.addCartItem(items, line(p,'150g','Espresso')),items);
  assert.equal(cart.maxCartQuantity(items[0],items),1);
  const fullLarge = cart.addCartItem(items,line(p,'400g','Espresso',2));
  assert.equal(cart.updateCartOptions(fullLarge,0,{ variantId:'large' }),fullLarge);
  const changed = cart.updateCartOptions(items,0,{ variantId:'large' });
  assert.equal(changed[0].unitPrice,29000); assert.equal(changed[0].weight,'400g');
  const merged = cart.updateCartOptions(items,0,{ grind:'Filter' });
  assert.equal(merged.length,1); assert.equal(merged[0].quantity,3); assert.equal(merged[0].unitPrice,13000);
  assert.equal(cart.sanitizeCart([line(p,'150g','Pour Over')])[0].grind,'Filter');
  const plentiful=product();plentiful.variants[0].stock=100;
  const capped=cart.addCartItem([],line(plentiful,'150g','Whole Bean',20));
  assert.equal(cart.addCartItem(capped,line(plentiful,'150g','Filter')),capped);
 });

test('Shop/PDP default to available 400g; ProductCard price and size match, including all sold out', () => {
  const p = product(); p.variants[0].stock=0;
  assert.equal(products.defaultProductVariant(p).size,'400g');
  const mocks = { ...uiMocks, '@/components/CartProvider': { useCart: () => ({ addToCart: () => true }) } };
  for (const [file,name] of [['components/ProductPurchase.tsx','ProductPurchase'],['components/ShopCatalog.tsx','ShopCatalog']]) {
    const C = load(file,mocks)[name]; const html = renderToStaticMarkup(React.createElement(C,{ product:p, products:[p] }));
    assert.match(html,/400g/); assert.match(html,/29,000/); assert.match(html,/ADD TO CART/);
    if (name==='ShopCatalog') assert.match(html,/<option value="400g" selected=""/);
    else assert.match(html,/<button[^>]*aria-pressed="true"[^>]*>400g/);
  }
  const Card=load('components/ProductCard.tsx',uiMocks).ProductCard;
  const html=renderToStaticMarkup(React.createElement(Card,{product:p}));
  assert.match(html,/29,000/); assert.match(html,/\/ <!-- -->400g|\/ 400g/);
  p.status='sold-out';
  const sold=renderToStaticMarkup(React.createElement(Card,{product:p}));
  assert.match(sold,/13,000/); assert.match(sold,/\/ <!-- -->150g|\/ 150g/);
  assert.ok(products.productVariants(p).every((v)=>!v.available));
  const SoldShop=load('components/ShopCatalog.tsx',mocks).ShopCatalog;
  const soldShop=renderToStaticMarkup(React.createElement(SoldShop,{products:[p]}));
  assert.match(soldShop,/Product A/);assert.match(soldShop,/disabled=""/);assert.match(soldShop,/SOLD OUT/);
  for (const status of ['hidden','draft']) assert.ok(products.productVariants(product({status})).every((v)=>!v.available));
});

test('cart refresh drops invisible/sold-out/empty lines, reprices and clamps combined size quantities', () => {
  const old=product(); const items=[line(old,'150g','Whole Bean',2),line(old,'150g','Filter',2)];
  const fresh=product(); fresh.variants[0].salePrice=14000;
  const next=cart.refreshCartProducts(items,[fresh]);
  assert.deepEqual(next.map((i)=>i.quantity),[2,1]); assert.ok(next.every((i)=>i.unitPrice===14000));
  for (const status of ['hidden','draft','sold-out']) assert.deepEqual(cart.refreshCartProducts(items,[product({status})]),[]);
  fresh.variants[0].stock=0; assert.deepEqual(cart.refreshCartProducts(items,[fresh]),[]);
});

test('admin shipping settings drive thresholds/fees; local zones match explicit DB bname', () => {
  const settings=shipping.settingsFromRow({free_shipping_threshold:50000,standard_shipping_fee:3000});
  assert.equal(shipping.calculateCheckoutTotal(49000,0,'shipping',settings).finalAmount,52000);
  assert.equal(shipping.calculateShippingFee(50000,'shipping',settings),0);
  assert.equal(shipping.freeShippingProgress(49000,settings).remaining,1000);
  const custom={...settings,freeShippingThreshold:60000,standardShippingFee:4500};
  assert.equal(shipping.calculateShippingFee(50000,'shipping',custom),4500);
  assert.equal(shipping.calculateShippingFee(49000,'pickup',custom),0);
  assert.equal(shipping.calculateShippingFee(49000,'local_delivery',custom),0);
  const zones=[{zone_type:'district',zone_value:'이의동',enabled:true}];
  assert.equal(shipping.isLocalDeliveryEligible({bname:'이의동'},zones),true);
  assert.equal(shipping.isLocalDeliveryEligible({roadAddress:'경기도 수원시 이의동'},zones),false);
  assert.equal(shipping.isLocalDeliveryEligible({bname:'이의동'},zones,false),false);
  for (const [zone_type,zone_value,address] of [['postal_prefix','165',{zonecode:'16500'}],['postal_range','16500-16599',{zonecode:'16510'}],['address_keyword','광교  호수',{roadAddress:'수원 광교 호수로 1'}]]) {
    assert.equal(shipping.isLocalDeliveryEligible(address,[{zone_type,zone_value,enabled:true}]),true);
  }
});

function database(p=product()) {
  const state={ product:p, order:null, calls:[], settings:{free_shipping_threshold:50000,standard_shipping_fee:3000,local_delivery_enabled:true}, zones:[], errors:{} };
  const access=load('lib/order-access.ts');
  const client={
    from(table) { const q={ select() {return q;}, eq() {return q;}, in() {return q;}, order() {return q;},
      result() { return { data: table==='orders'?state.order:table==='order_items'?state.order.order_items:table==='products'?[state.product]:table==='delivery_settings'?state.settings:state.zones, error:state.errors[table]??null }; },
      single() {return Promise.resolve(q.result());}, maybeSingle() {return Promise.resolve(q.result());}, then(resolve,reject) {return Promise.resolve(q.result()).then(resolve,reject);} };return q; },
    async rpc(name,args) {
      state.calls.push({name,args});
      if (name==='create_pending_order') {
        if (!state.order) {
          const order_items=args.p_items.map((i,index)=>{const v=state.product.variants.find((v)=>v.id===i.variant_id && v.size===i.weight); return {...i,id:`item-${index}`,product_name:state.product.name,unit_price:v.salePrice??v.price,subtotal:(v.salePrice??v.price)*i.quantity};});
          const subtotal=order_items.reduce((n,i)=>n+i.subtotal,0);
          const fee=shipping.calculateShippingFee(subtotal,args.p_delivery_method,shipping.settingsFromRow(state.settings));
          state.order={id:ORDER_ID,order_number:'TM-TEST',order_items,total:subtotal+fee,subtotal,product_subtotal:subtotal,shipping_fee:fee,final_amount:subtotal+fee,payment_status:'pending',discount_amount:0,
            guest_access_token_hash:args.p_guest_token_hash,delivery_method:args.p_delivery_method,fulfillment_type:args.p_delivery_method==='pickup'?'pickup':'delivery',customer_name:args.p_customer_name,recipient_name:args.p_customer_name,phone:args.p_phone,email:args.p_email,
            shipping_zonecode:args.p_zonecode,shipping_road_address:args.p_road_address,shipping_jibun_address:args.p_jibun_address,shipping_detail_address:args.p_detail_address,shipping_bname:args.p_bname,shipping_memo_type:args.p_memo_type,shipping_memo_text:args.p_memo_text,created_at:'2026-10-06T00:00:00Z',order_status:'new'};
        }
        return {data:[{order_id:state.order.id,order_number:state.order.order_number,total:state.order.total,order_name:state.product.name,token_matches:state.order.guest_access_token_hash===args.p_guest_token_hash}],error:null};
      }
      if (name==='finalize_paid_order') {
        if (state.order.payment_status==='paid') return {data:'already_paid',error:null};
        if (state.finalizeResult) return {data:state.finalizeResult,error:null};
        for(const item of state.order.order_items) state.product.variants.find((v)=>v.id===item.variant_id).stock-=item.quantity;
        Object.assign(state.order,{payment_status:'paid',payment_key:args.p_payment_key,order_status:'confirmed'});
        return {data:'paid',error:null};
      }
      if (name==='record_payment_failure') state.order.payment_status=args.p_cancelled?'cancelled':'failed';
      return {data:null,error:null};
    },
  };
  return {state,client,access};
}
const request=(body)=>new Request('http://internal.test/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
function paymentRoutes(db) {
  let approvals=0,cancellations=0;
  const payment={confirmPayment:async(key,id,total)=>{approvals++;if(db.state.failApproval)throw Error('mock decline');return {paymentKey:key,orderId:id,totalAmount:total,status:'DONE',method:'CARD'};},
    getPayment:async()=>{if(db.state.approvedPayment)return db.state.approvedPayment;throw Error('mock not paid');},cancelPayment:async()=>{cancellations++;if(db.state.failCancellation)throw Error('mock cancellation unavailable');},isConfirmedPayment:(p,id,total)=>p.status==='DONE'&&p.orderId===id&&p.totalAmount===total};
  const mocks={'@/lib/supabase/service':{createServiceClient:()=>db.client},'@/services/payment':payment};
  return {confirm:load('app/api/payments/confirm/route.ts',mocks).POST,fail:load('app/api/payments/fail/route.ts',mocks).POST,webhook:load('app/api/payments/webhook/route.ts',mocks).POST,counts:()=>({approvals,cancellations})};
}
async function pending(db,method='shipping') {
  const mocks={'@/lib/supabase/config':{hasSupabaseEnv:true},'@/lib/supabase/server':{createClient:async()=>db.client}};
  const route=load('app/api/orders/route.ts',mocks).POST;
  const previous=[process.env.SUPABASE_SERVICE_ROLE_KEY,process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY];
  process.env.SUPABASE_SERVICE_ROLE_KEY='mock-only';process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY='mock-only';
  try {
    const response=await route(request({customerName:'Tester',phone:'01012345678',email:'test@example.test',fulfillmentType:method,zonecode:'16500',roadAddress:'수원 광교로 1',jibunAddress:'수원시 이의동 1',detailAddress:'101호',bname:'이의동',memoType:'직접 입력',memoText:'문 앞',items:[line(db.state.product),line(db.state.product,'150g','Filter',2)],idempotencyKey:REFERENCE,accessToken:TOKEN}));
    assert.equal(response.status,200);return response.json();
  } finally { ['SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_TOSS_CLIENT_KEY'].forEach((name,i)=>previous[i]===undefined?delete process.env[name]:process.env[name]=previous[i]); }
}

test('orders RPC contract, mock pending → paid, size deduction once, success response and Admin snapshot',async()=>{
  const db=database(); const created=await pending(db);
  assert.equal(created.amount,42000); assert.equal(db.state.product.variants[0].stock,3);
  const args=db.state.calls[0].args;
  assert.deepEqual(args.p_items.map((i)=>[i.product_id,i.variant_id,i.weight,i.grind,i.quantity]),[[PRODUCT_ID,'small','150g','Whole Bean',1],[PRODUCT_ID,'small','150g','Filter',2]]);
  assert.equal(args.p_guest_token_hash,db.access.hashAccessToken(TOKEN));assert.equal(args.p_memo_text,'문 앞');
  const routes=paymentRoutes(db),body={orderId:ORDER_ID,paymentKey:'mock-payment',amount:created.amount,accessToken:TOKEN};
  const response=await routes.confirm(request(body));assert.equal(response.status,200);
  const result=await response.json();assert.equal(result.order.payment_status,'paid');assert.equal(result.order.delivery_method,'shipping');
  assert.equal(db.state.product.variants[0].stock,0);assert.equal(db.state.product.variants[1].stock,2);
  db.state.product.status='hidden';db.state.settings.standard_shipping_fee=9999;
  assert.equal((await routes.confirm(request(body))).status,200);
  assert.deepEqual(routes.counts(),{approvals:1,cancellations:0});
  assert.equal(db.state.calls.filter((c)=>c.name==='finalize_paid_order').length,1);
  const Admin=load('app/admin/orders/[id]/page.tsx',{...uiMocks,'@/lib/supabase/server':{createClient:async()=>db.client},'@/components/OrderStatusSelect':{OrderStatusSelect:()=>null},'@/components/AdminStatusBadge':{StatusBadge:({value})=>React.createElement('span',null,value)}}).default;
  const html=renderToStaticMarkup(await Admin({params:Promise.resolve({id:ORDER_ID})}));
  for(const expected of ['Product A','150g','Whole Bean','Filter','Qty 2','paid','Tester','101호','문 앞','39,000','3,000','42,000'])assert.ok(html.includes(expected),expected);
});

test('confirmation blocks changed variant price/status/stock, forged amount/token and unavailable settings before mock approval',async()=>{
  for(const change of ['price','stock','sold-out','hidden','draft','variant-id','settings','amount','token']) {
    const db=database();const created=await pending(db);const routes=paymentRoutes(db);
    const body={orderId:ORDER_ID,paymentKey:'mock-payment',amount:created.amount,accessToken:TOKEN};
    if(change==='price')db.state.product.variants[0].salePrice=14000;
    if(change==='stock')db.state.product.variants[0].stock=2;
    if(['sold-out','hidden','draft'].includes(change))db.state.product.status=change;
    if(change==='variant-id')db.state.product.variants[0].id='replaced';
    if(change==='settings')db.state.errors.delivery_settings={message:'unavailable'};
    if(change==='amount')body.amount=1;if(change==='token')body.accessToken='forged';
    const response=await routes.confirm(request(body));assert.ok(response.status>=400,change);
    assert.equal(routes.counts().approvals,0,change);assert.equal(db.state.product.variants[1].stock,2);
  }
});

test('payment decline/fail record failure without deduction; finalize conflict triggers mock compensation',async()=>{
  const db=database();const created=await pending(db);const routes=paymentRoutes(db);
  db.state.failApproval=true;
  const body={orderId:ORDER_ID,paymentKey:'mock-payment',amount:created.amount,accessToken:TOKEN};
  assert.equal((await routes.confirm(request(body))).status,400);
  assert.equal(db.state.order.payment_status,'failed');assert.equal(db.state.product.variants[0].stock,3);
  assert.equal((await routes.fail(request({orderId:ORDER_ID,accessToken:TOKEN,code:'USER_CANCEL',message:'mock cancellation'}))).status,200);
  assert.equal(db.state.product.variants[0].stock,3);
  db.state.failApproval=false;db.state.finalizeResult='out_of_stock';
  assert.equal((await routes.confirm(request(body))).status,409);
  assert.equal(routes.counts().cancellations,1);assert.equal(db.state.product.variants[0].stock,3);
});

test('CartProvider actions enforce shared limits; navigation refresh reprices; late responses cannot resurrect cleared cart',async()=>{
  const h=hooks(),listeners=new Map();let pathname='/shop';const p=product();
  global.window={localStorage:storage(),addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name)=>listeners.delete(name)};
  global.fetch=async()=>Response.json({products:[p]});
  const Provider=load('components/CartProvider.tsx',{react:h.api,'next/navigation':{usePathname:()=>pathname}}).CartProvider;
  const render=()=>h.render(()=>Provider({children:null})).props.value;
  render();await h.effects();render();await h.effects();let value=render();
  assert.equal(value.add(line(p)),true);assert.equal(value.add(line(p,'150g','Filter',2)),true);
  assert.equal(value.add(line(p,'150g','Espresso')),false);
  value=render();value.updateQuantity(cart.cartItemKey(value.items[0]),9);value=render();assert.equal(value.cartCount,3);
  value.updateOptions(0,{grind:'Filter'});value=render();assert.equal(value.items.length,1);assert.equal(value.cartCount,3);
  p.variants[0].salePrice=14000;pathname='/cart';render();await h.effects();value=render();
  assert.equal(value.cartSubtotal,42000);assert.equal(value.cartReady,true);
  let resolve;global.fetch=()=>new Promise((r)=>resolve=r);
  const pendingRefresh=value.refreshCart();value.clear();resolve(Response.json({products:[p]}));
  await assert.rejects(pendingRefresh,/장바구니가 변경/);assert.equal(render().items.length,0);
  global.fetch=async()=>new Response('',{status:503});value=render();value.add(line(p));
  await assert.rejects(value.refreshCart());assert.equal(render().cartReady,false);
});

test('canonical checkout uses saved default address, local eligibility, complete contract and stable/changed retry references',async()=>{
  const h=hooks(),p=product(),items=[line(p)],orders=[],payments=[];
  global.sessionStorage=storage();global.location={origin:'http://internal.test'};
  const TossPayments=()=>({payment:()=>({requestPayment:async(options)=>{payments.push(options);throw Error('mock interruption');}})});
  TossPayments.ANONYMOUS='anonymous';global.window={TossPayments};
  const addresses=[{id:'other',label:'Other',recipient_name:'Other',phone:'01099999999',zonecode:'99999',road_address:'다른 주소',jibun_address:'다른동',detail_address:'2호',is_default:false},
    {id:'default',label:'Home',recipient_name:'Recipient',phone:'01012345678',zonecode:'16500',road_address:'수원 광교로 1',jibun_address:'경기도 수원시 이의동 1',detail_address:'101호',building_name:'Building',is_default:true}];
  const bootstrap={settings:shipping.DEFAULT_DELIVERY_SETTINGS,zones:[{zone_type:'district',zone_value:'이의동',enabled:true}],user:{name:'Account',email:'member@example.test'},addresses};
  global.fetch=async(url,init)=>{
    if(url==='/api/checkout')return Response.json(bootstrap);
    if(url==='/api/orders'){const body=JSON.parse(init.body);orders.push(body);return Response.json({orderId:ORDER_ID,clientKey:'mock-client',amount:12345,orderName:'Product A'});}
    throw Error(`Unexpected external request: ${url}`);
  };
  const C=load('components/PaymentCheckout.tsx',{...uiMocks,react:h.api,'@/components/CartProvider':{useCart:()=>({items,total:13000,cartReady:true,refreshError:'',refreshCart:async()=>items})}}).default;
  const render=()=>h.render(C);render();await h.effects();let tree=render();
  assert.equal(elements(tree).find((el)=>el.type==='input'&&el.props.value==='Recipient').props.value,'Recipient');
  elements(tree).find((el)=>el.type==='select'&&el.props.value==='문 앞에 놓아주세요').props.onChange({target:{value:'직접 입력'}});tree=render();
  elements(tree).find((el)=>el.type==='textarea').props.onChange({target:{value:'로컬배송 메모'}});tree=render();
  const local=elements(tree).find((el)=>el.type==='button'&&text(el).startsWith('CASA LOCAL DELIVERY'));
  assert.equal(local.props.disabled,false);local.props.onClick();tree=render();await h.effects();
  await elements(tree).find((el)=>el.type==='form').props.onSubmit({preventDefault(){}});
  assert.equal(orders.length,1);assert.equal(orders[0].fulfillmentType,'local_delivery');assert.equal(orders[0].bname,'이의동');assert.equal(orders[0].detailAddress,'101호');
  assert.equal(orders[0].memoType,'직접 입력');assert.equal(orders[0].memoText,'로컬배송 메모');
  assert.ok(elements(tree).some((el)=>el.props.className==='delivery-memo'));
  assert.equal(orders[0].items[0].variantId,'small');assert.equal(orders[0].items[0].grind,'Whole Bean');assert.ok(orders[0].accessToken.length>=32);
  assert.equal(payments[0].amount.value,12345); // Uses the server total, never the UI subtotal.
  tree=render();await elements(tree).find((el)=>el.type==='form').props.onSubmit({preventDefault(){}});
  assert.equal(orders[1].idempotencyKey,orders[0].idempotencyKey);
  tree=render();elements(tree).find((el)=>el.type==='button'&&text(el).startsWith('매장 픽업')).props.onClick();tree=render();await h.effects();
  await elements(tree).find((el)=>el.type==='form').props.onSubmit({preventDefault(){}});
  assert.notEqual(orders[2].idempotencyKey,orders[1].idempotencyKey);assert.equal(orders[2].fulfillmentType,'pickup');
  assert.equal(orders[2].memoType,'');assert.equal(orders[2].memoText,'');
  assert.ok(!elements(tree).some((el)=>el.props.className==='delivery-memo'));
  tree=render();elements(tree).find((el)=>el.type==='button'&&text(el).startsWith('CASA LOCAL DELIVERY')).props.onClick();tree=render();await h.effects();
  elements(tree).find((el)=>el.type==='button'&&text(el)==='+ 새 배송지').props.onClick();render();await h.effects();tree=render();
  const shippingButton=elements(tree).find((el)=>el.type==='button'&&text(el).startsWith('택배 배송'));
  assert.equal(shippingButton.props.className.trim(),'selected');
  assert.equal(elements(tree).find((el)=>el.type==='button'&&text(el).startsWith('CASA LOCAL DELIVERY')).props.disabled,true);
});

test('success clears cart only for paid response and shows local delivery; failure preserves cart and records session order',async()=>{
  for(const status of ['pending','paid']){
    const h=hooks();let clears=0;global.sessionStorage=storage();sessionStorage.setItem('tominiko-order-access-token',TOKEN);
    const params=new URLSearchParams({paymentKey:'mock',orderId:ORDER_ID,amount:'39000'});
    global.fetch=async()=>Response.json({order:{order_number:'TM-TEST',total:39000,fulfillment_type:'delivery',delivery_method:'local_delivery',payment_status:status,order_items:[{product_name:'Product A',weight:'150g',grind:'Filter',quantity:3,subtotal:39000}]}});
    const C=load('app/checkout/success/page.tsx',{...uiMocks,react:h.api,'next/navigation':{useSearchParams:()=>params},'@/components/CartProvider':{useCart:()=>({clear:()=>clears++})}}).default;
    h.render(C);await h.effects();const tree=h.render(C);
    assert.equal(clears,status==='paid'?1:0);
    if(status==='paid'){assert.match(text(tree),/CASA LOCAL DELIVERY/);assert.match(text(tree),/TM-TEST/);assert.match(text(tree),/39,000/);assert.match(text(tree),/Product A · 150g · Filter/);}
    else assert.match(text(tree),/결제를 완료하지 못했습니다/);
  }
  const h=hooks();sessionStorage.setItem('tominiko-payment-order-id',ORDER_ID);let failure;
  global.fetch=async(url,init)=>{assert.equal(url,'/api/payments/fail');failure=JSON.parse(init.body);return Response.json({ok:true});};
  const params=new URLSearchParams({code:'USER_CANCEL',message:'mock cancelled'});
  const Fail=load('app/checkout/fail/page.tsx',{...uiMocks,react:h.api,'next/navigation':{useSearchParams:()=>params}}).default;
  const tree=h.render(Fail);await h.effects();assert.equal(failure.orderId,ORDER_ID);assert.equal(failure.accessToken,TOKEN);
  assert.ok(elements(tree).some((el)=>el.props.href==='/checkout'));assert.match(text(tree),/장바구니는 그대로 유지/);
});

test('public product queries filter active/sold-out, while existing preview includes inactive products',async()=>{
  const calls=[];
  function client(){return {from(){const query={select(){return query;},eq(...args){calls.push(['eq',...args]);return query;},in(...args){calls.push(['in',...args]);return query;},order(){return query;},abortSignal(){return query;},single(){return Promise.resolve({data:product(),error:null});},then(resolve,reject){return Promise.resolve({data:[product()],error:null}).then(resolve,reject);}};return query;}};}
  const service=load('services/products.ts',{'@/lib/supabase/config':{hasSupabaseEnv:true},'@/lib/supabase/server':{createClient:async()=>client()},'@/services/reviews':{attachReviewSummaries:async(p)=>p}});
  await service.getProducts({activeOnly:true});assert.ok(calls.some((c)=>c[0]==='in'&&c[1]==='status'&&JSON.stringify(c[2])==='["active","sold-out"]'));
  calls.length=0;await service.getProduct('product-a');assert.ok(calls.some((c)=>c[0]==='in'&&c[1]==='status'));
  calls.length=0;await service.getProduct('product-a',{includeInactive:true});assert.ok(!calls.some((c)=>c[1]==='status'));
});

test('guest pickup needs no address; guest shipping uses Daum structured fields and never saves an address',async()=>{
  const h=hooks(),items=[line()],orders=[];let daumComplete;
  global.sessionStorage=storage();global.location={origin:'http://internal.test'};
  const TossPayments=()=>({payment:()=>({requestPayment:async()=>{throw Error('mock interruption');}})});TossPayments.ANONYMOUS='guest';
  global.window={TossPayments};
  global.document={getElementById:()=>null};
  global.fetch=async(url,init)=>{
    if(url==='/api/checkout')return Response.json({settings:shipping.DEFAULT_DELIVERY_SETTINGS,zones:[],user:null,addresses:[]});
    assert.equal(url,'/api/orders');orders.push(JSON.parse(init.body));return Response.json({orderId:ORDER_ID,clientKey:'mock',amount:16000,orderName:'Product A'});
  };
  const C=load('components/PaymentCheckout.tsx',{...uiMocks,react:h.api,'@/components/CartProvider':{useCart:()=>({items,total:13000,cartReady:true,refreshCart:async()=>items})}}).default;
  const render=()=>h.render(C);render();await h.effects();let tree=render();
  assert.ok(!text(tree).includes('배송지 저장'));
  for(const [label,value] of [['이름','Guest'],['연락처','01012345678']]){
    const input=elements(tree).filter((el)=>el.type==='label').find((el)=>text(el)===label).props.children.find((el)=>el?.type==='input');
    input.props.onChange({target:{value}});tree=render();
  }
  elements(tree).find((el)=>el.type==='button'&&text(el).startsWith('매장 픽업')).props.onClick();tree=render();await h.effects();
  assert.ok(!elements(tree).some((el)=>el.props.className==='delivery-memo'));
  await elements(tree).find((el)=>el.type==='form').props.onSubmit({preventDefault(){}});assert.equal(orders[0].fulfillmentType,'pickup');assert.equal(orders[0].zonecode,'');
  assert.equal(orders[0].memoType,'');assert.equal(orders[0].memoText,'');
  tree=render();elements(tree).find((el)=>el.type==='button'&&text(el).startsWith('택배 배송')).props.onClick();tree=render();
  elements(tree).find((el)=>el.type==='button'&&text(el)==='주소 찾기').props.onClick();tree=render();
  const frame=elements(tree).find((el)=>el.props.className==='postcode-frame');frame.props.ref.current={innerHTML:''};
  await h.effects();assert.equal(daumComplete,undefined);
  window.daum={Postcode:class{constructor(options){daumComplete=options.oncomplete;}embed(){}}};
  elements(tree).find((el)=>el.props.src?.includes('daumcdn')).props.onReady();render();await h.effects();
  assert.equal(typeof daumComplete,'function');
  daumComplete({zonecode:'16500',roadAddress:'수원 광교로 1',jibunAddress:'수원 이의동 1',buildingName:'Building',bname:'이의동'});tree=render();
  elements(tree).find((el)=>el.props.id==='detailAddress').props.onChange({target:{value:'101호'}});tree=render();
  await elements(tree).find((el)=>el.type==='form').props.onSubmit({preventDefault(){}});
  assert.ok(elements(tree).some((el)=>el.props.className==='delivery-memo'));
  assert.equal(orders[1].memoType,'문 앞에 놓아주세요');assert.equal(orders[1].memoText,'');
  assert.equal(orders[1].fulfillmentType,'shipping');assert.equal(orders[1].bname,'이의동');assert.equal(orders[1].roadAddress,'수원 광교로 1');assert.equal(orders[1].detailAddress,'101호');
  assert.notEqual(orders[1].idempotencyKey,orders[0].idempotencyKey);
});


test('orders API strips pickup memos from the Admin snapshot, preserving shipping/local delivery memos',async()=>{
  for(const method of ['pickup','shipping','local_delivery']) {
    const db=database();await pending(db,method);
    const expectedType=method==='pickup'?null:'직접 입력',expectedText=method==='pickup'?null:'문 앞';
    assert.equal(db.state.calls[0].args.p_memo_type,expectedType);
    assert.equal(db.state.calls[0].args.p_memo_text,expectedText);
    assert.equal(db.state.order.shipping_memo_type,expectedType);
    assert.equal(db.state.order.shipping_memo_text,expectedText);
  }
});

test('a saved address is posted once across retries after order creation or Toss initialization errors',async()=>{
  for(const failure of ['order','toss']) {
    const h=hooks(),items=[line()];let complete,saves=0,orders=0;
    global.sessionStorage=storage();global.location={origin:'http://internal.test'};global.document={getElementById:()=>null};
    const TossPayments=()=>{throw Error('mock Toss initialization error');};TossPayments.ANONYMOUS='guest';
    global.window={TossPayments,daum:{Postcode:class{constructor(options){complete=options.oncomplete;}embed(){}}}};
    global.fetch=async(url,init)=>{
      if(url==='/api/checkout')return Response.json({settings:shipping.DEFAULT_DELIVERY_SETTINGS,zones:[],user:{name:'Member',phone:'01012345678'},addresses:[]});
      if(url==='/api/addresses'){saves++;assert.equal(JSON.parse(init.body).detailAddress,'101호');return Response.json({address:{id:'saved'}});}
      assert.equal(url,'/api/orders');orders++;
      if(failure==='order'&&orders===1)return Response.json({error:'mock order error'},{status:503});
      return Response.json({orderId:ORDER_ID,clientKey:'mock',amount:16000,orderName:'Product A'});
    };
    const C=load('components/PaymentCheckout.tsx',{...uiMocks,react:h.api,'@/components/CartProvider':{useCart:()=>({items,total:13000,cartReady:true,refreshCart:async()=>items})}}).default;
    const render=()=>h.render(C);render();await h.effects();let tree=render();
    elements(tree).find((el)=>el.type==='button'&&text(el)==='주소 찾기').props.onClick();tree=render();
    elements(tree).find((el)=>el.props.className==='postcode-frame').props.ref.current={innerHTML:''};await h.effects();
    complete({zonecode:'16500',roadAddress:'수원 광교로 1',jibunAddress:'수원 이의동 1',buildingName:'Building',bname:'이의동'});tree=render();
    elements(tree).find((el)=>el.props.id==='detailAddress').props.onChange({target:{value:'101호'}});tree=render();
    elements(tree).find((el)=>el.type==='input'&&el.props.type==='checkbox').props.onChange({target:{checked:true}});tree=render();
    await elements(tree).find((el)=>el.type==='form').props.onSubmit({preventDefault(){}});tree=render();
    assert.equal(saves,1,failure);assert.equal(elements(tree).find((el)=>el.type==='input'&&el.props.type==='checkbox').props.checked,false);
    assert.match(text(tree),failure==='order'?/mock order error/:/mock Toss initialization error/);
    await elements(tree).find((el)=>el.type==='form').props.onSubmit({preventDefault(){}});
    assert.equal(saves,1,failure);assert.equal(orders,2,failure);
  }
});


test('approved pending payment recovers after price change without another approval or double deduction', async()=>{
  const db=database(), created=await pending(db), routes=paymentRoutes(db);
  db.state.approvedPayment={paymentKey:'mock-payment',orderId:ORDER_ID,totalAmount:created.amount,status:'DONE'};
  db.state.product.variants[0].salePrice=14000;
  const body={orderId:ORDER_ID,paymentKey:'mock-payment',amount:created.amount,accessToken:TOKEN};
  assert.equal((await routes.confirm(request(body))).status,200);
  assert.equal((await routes.confirm(request(body))).status,200);
  assert.equal(routes.counts().approvals,0);
  assert.equal(db.state.product.variants[0].stock,0);
});

test('failed compensation remains retryable and never records or claims successful cancellation', async()=>{
  for(const endpoint of ['confirm','webhook']) {
    const db=database(), created=await pending(db), routes=paymentRoutes(db);
    db.state.finalizeResult='out_of_stock';db.state.failCancellation=true;
    db.state.approvedPayment={paymentKey:'mock-payment',orderId:ORDER_ID,totalAmount:created.amount,status:'DONE'};
    const body=endpoint==='confirm'?{orderId:ORDER_ID,paymentKey:'mock-payment',amount:created.amount,accessToken:TOKEN}:{data:{paymentKey:'mock-payment'}};
    const response=await routes[endpoint](request(body));
    assert.equal(response.status,502);
    const failure=db.state.calls.find(c=>c.name==='record_payment_failure');
    assert.equal(failure.args.p_cancelled,false);assert.equal(failure.args.p_code,'CANCELLATION_FAILED');
    assert.doesNotMatch(JSON.stringify(await response.json()),/자동 취소되었습니다/);
    db.state.failCancellation=false;
    assert.equal((await routes[endpoint](request(body))).status,409);
    assert.equal(db.state.order.payment_status,'cancelled');assert.equal(db.state.product.variants[0].stock,3);
  }
});

test('payment routes reject null JSON without runtime errors', async()=>{
  const routes=paymentRoutes(database());
  for(const endpoint of ['confirm','fail','webhook']) assert.equal((await routes[endpoint](request(null))).status,400);
});

test('payment result pages survive unavailable browser session storage',async()=>{
  const previous=global.sessionStorage;global.sessionStorage={getItem(){throw Error('storage unavailable');}};
  try { for(const entry of ['app/checkout/success/page.tsx','app/checkout/fail/page.tsx']) {
    const h=hooks(), C=load(entry,{...uiMocks,react:h.api,'next/navigation':{useSearchParams:()=>new URLSearchParams()},'@/components/CartProvider':{useCart:()=>({clear(){throw Error('must retain cart');}})}}).default;
    h.render(C);await h.effects();assert.match(text(h.render(C)),/다시 시도/);
  }}finally{global.sessionStorage=previous;}
});

test('Admin order network failure rolls back status and enables retry',async()=>{
  const h=hooks(), C=load('components/OrderStatusSelect.tsx',{react:h.api,'next/navigation':{useRouter:()=>({refresh(){}})}}).OrderStatusSelect;
  const render=()=>C({id:ORDER_ID,initial:'confirmed',deliveryMethod:'shipping',paymentStatus:'paid'});
  let tree=h.render(render);global.fetch=async()=>{throw Error('offline');};
  await elements(tree).find(e=>e.type==='button').props.onClick();await new Promise(setImmediate);
  tree=h.render(render);assert.equal(elements(tree).find(e=>e.type==='button').props.disabled,false);assert.match(text(tree),/다시/);
});

test('login configuration/network and OAuth errors show a retryable alert',async()=>{
 for(const oauth of [false,true]) {
  const h=hooks(), C=load('app/login/page.tsx',{react:h.api,'next/navigation':{useRouter:()=>({push(){},refresh(){}})},'@/lib/supabase/client':{createClient(){throw Error('mock configuration unavailable');}}}).default;
  const tree=h.render(C);
  if(oauth) await elements(tree).find(e=>e.type==='button'&&text(e)==='CONTINUE WITH GOOGLE').props.onClick();
  else await elements(tree).find(e=>e.type==='form').props.onSubmit({preventDefault(){}});
  const after=h.render(C);assert.match(text(after),/다시 시도/);assert.equal(elements(after).find(e=>e.props.type==='submit').props.disabled,false);
 }
});

test('Admin auth rejects guests/members and pending orders cannot advance fulfillment',async()=>{
 for(const role of [null,'member','admin']) {
  const client={auth:{getUser:async()=>({data:{user:role?{id:'user'}:null}})},from(){const q={select(){return q},eq(){return q},single:async()=>({data:{role}})};return q;}};
  const admin=load('lib/supabase/admin.ts',{'@/lib/supabase/config':{hasSupabaseEnv:true},'@/lib/supabase/server':{createClient:async()=>client}});
  assert.equal(await admin.getAdminClient(),role==='admin'?client:null);
 }
 const denied=load('app/api/admin/orders/route.ts',{'@/lib/supabase/admin':{getAdminClient:async()=>null}}).PATCH;
 assert.equal((await denied(request({id:ORDER_ID,order_status:'shipped'}))).status,403);
 const db=database();await pending(db);
 const allowed=load('app/api/admin/orders/route.ts',{'@/lib/supabase/admin':{getAdminClient:async()=>db.client}}).PATCH;
 for(const status of ['roasting','preparing','shipped','completed'])assert.equal((await allowed(request({id:ORDER_ID,order_status:status}))).status,409);
 assert.equal((await allowed(request(null))).status,400);
});
