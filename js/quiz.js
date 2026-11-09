/* World Ratio — Finance Quiz. Self-contained; does not alter the site's existing app logic. */
(function () {
  "use strict";
  const QUIZZES = {
    easy: [
      ["What does inflation mean?","A general rise in prices over time","A fall in all wages","A rise in the value of money",0,"When prices rise broadly, the same amount of money buys less than before. Inflation is usually measured by tracking the prices of a basket of commonly purchased goods and services. A little inflation can be normal in a growing economy, but rapid or unpredictable price rises make it harder for households and businesses to plan. That is why central banks pay close attention to it."],
      ["Which institution issues the Indian rupee?","SEBI","Reserve Bank of India","NITI Aayog",1,"The Reserve Bank of India is India's central bank and issues banknotes. The RBI manages India's monetary system, issues most banknotes and works to maintain price and financial stability. It also supervises important parts of the banking system. A central bank is different from an ordinary commercial bank: people generally use commercial banks for everyday accounts and payments."],
      ["What is a stock?","A loan to a government","A type of tax","A small ownership stake in a company",2,"A share represents a portion of ownership in a company. Owning a share means you participate in the company's fortunes: the value of your holding can rise or fall, and some shares may pay dividends. Shareholders do not own a specific desk or machine; they own a proportional claim on the company. Shares can be traded on stock exchanges."],
      ["What does GDP broadly measure?","The value of final goods and services produced in an economy","Only a country's exports","The amount of cash in banks",0,"Gross domestic product measures the value of final goods and services produced within a country during a period. GDP is a broad measure of economic production, not a direct measure of how wealthy every person feels. It can rise even when gains are unevenly distributed. Economists compare GDP over time, often adjusting for inflation, to understand whether an economy is producing more in real terms."],
      ["What is a budget deficit?","When exports exceed imports","When government spending exceeds its revenue","When a company makes a profit",1,"A government has a deficit when it spends more than it receives in revenue over a period. A deficit is not automatically proof that a government is in trouble. Governments may borrow to fund infrastructure, public services or emergency support. What matters includes the size and persistence of the deficit, borrowing costs, economic growth and whether the spending can be sustained over time."],
      ["What is a dividend?","A fee paid to a broker","A tax on imports","A share of company profits distributed to shareholders",2,"A company may distribute part of its profits to shareholders as dividends. Dividends are not guaranteed: a company's board may change, reduce or cancel them. Some businesses reinvest profits instead of paying dividends. Investors often look at dividends alongside the company's cash flow, debt and growth plans rather than assuming a high payout is always better."],
      ["What is a bank deposit?","Money placed with a bank","A share traded on an exchange","A government bond only",0,"A deposit is money held by a bank for a customer, subject to the account's terms. A deposit is different from an investment in shares: the account terms determine the interest, access and protections. Banks use deposits as part of their funding, including to support lending. It is still important to understand the account's fees, interest rate and applicable deposit-protection rules."],
      ["Which market is commonly associated with buying and selling company shares?","Housing market","Stock market","Foreign exchange only",1,"Stock exchanges bring together buyers and sellers of listed shares. Stock exchanges provide rules and systems for listing, trading and reporting prices. The market price of a share changes as buyers and sellers place orders and react to information. Buying a share means accepting that its value can fluctuate, sometimes sharply."],
      ["What does a central bank commonly influence?","The weather","Company logos","Interest rates and monetary conditions",2,"Central banks use policy tools to influence borrowing costs, money and credit conditions. Central banks may change policy rates, provide liquidity and communicate their outlook. These decisions can influence loan rates, savings returns, currency values and asset prices, but the effects are not instant or identical for everyone. Central banks usually balance inflation goals with broader economic and financial conditions."],
      ["What is a bond in simple terms?","A loan made to a government or company","A piece of company ownership","A savings account password",0,"A bond is a debt investment: the issuer borrows money and promises payments under set terms. When an investor buys a bond, they are lending to its issuer rather than buying ownership. Bonds commonly promise interest payments and repayment of principal, but the issuer could fail to pay. Bond prices can also move when market interest rates or perceptions of credit risk change."],
      ["What does a bank usually do with a loan?","Gives it away with no repayment expected","Lends money that the borrower must repay under agreed terms","Turns it into a dividend",1,"Loans are credit: borrowers repay the amount, usually with interest and according to a schedule. Loan agreements set out the amount borrowed, interest, repayment schedule and other conditions. Lenders assess whether a borrower is likely to repay, while borrowers should consider the total cost and affordability. Missing payments can lead to penalties, collection action and damage to credit history."],
      ["What is a recession commonly understood to be?","A period of unusually fast growth","A sudden rise in stock prices","A significant decline in economic activity",2,"A recession is a broad downturn in economic activity; definitions vary by country and institution. Economists look at several indicators to judge whether a downturn is happening, including output, employment, income and spending. A recession can affect businesses and households through lower demand and job losses. It is not simply a temporary fall in the stock market."],
      ["What does saving usually mean?","Setting aside money for future use","Buying every trending stock","Borrowing more than you earn",0,"Saving means keeping some income rather than spending it now. Saving creates money that can be used for emergencies, planned purchases or future goals. It is usually kept in relatively accessible, lower-risk places, while investing involves taking risk in pursuit of a return. A sensible plan often considers both short-term savings and longer-term investments."],
      ["What is an exchange rate?","The fee charged by every bank","The price of one currency in terms of another","A company's annual profit",1,"For example, an exchange rate tells you how many rupees are needed to buy one US dollar. Exchange rates matter for travel, imports, exports, overseas education and investments. If a currency weakens, foreign goods may become more expensive for local buyers, while exporters may find their products cheaper abroad. Actual effects depend on contracts, pricing and how businesses manage currency risk."],
      ["What is diversification?","Putting all money into one company","Buying only the most expensive asset","Spreading investments across different assets",2,"Diversification spreads exposure so one investment does not determine the whole portfolio's outcome. Diversification can reduce the impact of one company or asset performing badly, but it cannot eliminate all risk. Different investments may fall together during a broad market shock. A diversified portfolio spreads exposure across assets, sectors, regions or issuers in a way that fits the investor's goals."]
    ],
    medium: [
      ["What was a major trigger of the 2008 global financial crisis?","The collapse of the US housing and mortgage-credit market","The launch of the euro","A sudden shortage of gold coins",0,"Risky mortgage lending, complex securities and losses across financial institutions helped turn a housing bust into a global crisis. The crisis spread far beyond US housing because mortgages had been bundled into securities held by banks and investors around the world. When borrowers defaulted and house prices fell, uncertainty about the value of these products damaged confidence and funding markets. The episode showed how connected financial institutions can transmit risk internationally."],
      ["What is the main role of the IMF?","Running national stock exchanges","Supporting international monetary cooperation and providing financial assistance to member countries","Setting every country's income tax rate",1,"The International Monetary Fund works on monetary cooperation, financial stability and lending to countries facing balance-of-payments problems. The IMF monitors economic and financial developments, offers policy advice and provides lending to countries facing external financing problems. Its support often comes with agreed policy conditions. It is not a world government and does not set domestic tax rates or directly manage national stock exchanges."],
      ["What happened at Bretton Woods in 1944?","The first cryptocurrency was launched","The European Union was founded","A framework for the post-war international monetary system was agreed",2,"The conference shaped the post-war monetary order and led to the creation of the IMF and World Bank. The Bretton Woods conference took place near the end of the Second World War, when countries wanted a more stable international monetary framework. It helped establish the IMF and International Bank for Reconstruction and Development, now part of the World Bank Group. The original exchange-rate system later came under pressure and ended."],
      ["If a central bank raises its policy interest rate, what is it generally trying to do when inflation is high?","Cool borrowing and spending demand","Make every share price rise","Increase the supply of free credit",0,"Higher policy rates tend to make borrowing more expensive and can reduce demand, although effects take time. Higher rates can discourage some borrowing and spending, helping ease demand-driven inflation. They can also raise costs for borrowers, slow investment and affect employment. Central banks therefore weigh incoming data and the wider outlook; a rate increase is not a switch that instantly lowers every price."],
      ["What does a price-to-earnings (P/E) ratio compare?","A company's debt with its cash","A share price with earnings per share","Dividends with employee salaries",1,"P/E shows how much investors pay for each unit of a company's earnings per share. P/E is a valuation measure, not a guarantee that a share is cheap or expensive. A high ratio can reflect expectations of future growth, while a low one may reflect weak prospects or unusual earnings. It is most useful when compared with similar companies and understood alongside business quality and risk."],
      ["What is a sovereign bond?","A bond issued only by a private bank","A share in a state-owned company","Debt issued by a national government",2,"Governments issue sovereign bonds to borrow money. Their risks depend on the issuer, currency and terms. Sovereign bonds help governments finance spending and refinance existing debt. Investors consider the government's ability and willingness to repay, the currency of issue, maturity and inflation outlook. A government borrowing in a currency it controls faces different risks from one borrowing heavily in a foreign currency."],
      ["What does a current-account deficit broadly indicate?","Payments for imports, income and transfers exceed corresponding receipts","A government has no parliament","The stock exchange is closed",0,"The current account records trade in goods and services, primary income and transfers with the rest of the world. The current account is one part of a country's balance of payments. A deficit can be financed by capital inflows, borrowing or drawing on reserves, but persistent imbalances may create vulnerabilities. It should be interpreted alongside investment flows, exchange-rate arrangements and the country's broader economic position."],
      ["What is quantitative easing (QE)?","A tax charged on bank deposits","A central bank policy of buying assets to add liquidity and ease financial conditions","A rule that bans cash",1,"Through QE, a central bank buys assets—often government bonds—to lower longer-term yields and support market liquidity. QE is generally used when conventional interest-rate cuts may be limited or when financial conditions need additional support. Asset purchases can lower yields and encourage lending, but the effect depends on banks, investors and the economy. QE is not the same as handing cash directly to every household."],
      ["What does market capitalisation measure?","A company's yearly revenue","The total value of its office buildings","The market value of its outstanding shares",2,"Market cap is generally share price multiplied by the number of outstanding shares. Market capitalisation changes when the share price or the number of shares changes. It is a measure of the market's current valuation of a company's equity, not the same as the company's total enterprise value, revenue or cash in the bank. Large market cap does not mean an investment is risk-free."],
      ["Why can a currency depreciate?","Demand for it may weaken relative to other currencies","Its country's population gets younger","A stock exchange changes its logo",0,"Exchange rates move for many reasons, including interest-rate differences, trade flows, inflation expectations and investor confidence. A currency's value is influenced by supply and demand in foreign-exchange markets. Interest-rate expectations, inflation, political developments, trade and investor sentiment can all matter. Depreciation makes foreign currency more expensive in local-currency terms, but its impact varies across importers, exporters, borrowers and consumers."],
      ["What is an initial public offering (IPO)?","A central bank interest-rate meeting","The first public sale of a company's shares","A government budget announcement",1,"An IPO is when a company offers shares to public investors and lists them on an exchange, subject to local rules. An IPO can help a company raise capital and allow existing shareholders to sell some of their holdings, depending on the offer structure. The prospectus provides details about the business, risks and offer. A listing does not guarantee that the share price will rise after trading begins."],
      ["What is the yield to maturity (YTM) of a bond intended to estimate?","The bond's face value only","The issuer's annual sales","The annualised return implied by its price and promised cash flows if held to maturity",2,"YTM combines the bond's price, coupon payments and repayment at maturity, based on assumptions such as payments being made. YTM is a useful way to compare bonds, but it relies on assumptions, including that promised payments are made and the bond is held to maturity. If an investor sells earlier, their realised return may differ because market prices change. Taxes, fees and reinvestment rates can also affect the outcome."],
      ["What does a trade surplus mean?","A country exports more goods and services than it imports","A country has no imports","A country's currency cannot change",0,"A trade surplus means exports exceed imports over the period measured. A trade surplus is narrower than a current-account surplus: the current account also includes services, income and transfers. A surplus can reflect strong export performance, weak domestic demand or both. Its significance depends on what is driving it and how it fits into the country's overall economy."],
      ["What is a non-performing loan (NPL)?","A loan with an unusually low interest rate","A loan where repayment is overdue or unlikely, under the applicable rules","A loan that has already been repaid",1,"NPLs signal credit stress and can weaken a bank's income and balance sheet. Loan classification rules differ across jurisdictions, but an NPL generally indicates that a borrower is not making required payments or repayment is considered unlikely. A high level of NPLs can force banks to set aside provisions, reduce profits and become more cautious about lending."],
      ["What does a stock-market index such as the S&P 500 or NIFTY 50 do?","Guarantees returns to investors","Lists every company in the world","Tracks a selected group of securities as a market benchmark",2,"An index follows a defined basket of securities and helps investors understand how that segment of the market is performing. An index is calculated using a defined method, such as market-cap weighting or equal weighting. It is a benchmark rather than an investment product by itself, although funds can track it. Index membership and performance tell you about that selected group, not necessarily every company or household in the economy."]
    ],
    hard: [
      ["Under the original Bretton Woods system, the US dollar was convertible into which asset for foreign official holders?","Gold at a fixed official price","Silver at a market price","Oil at an OPEC-set price",0,"The system linked participating currencies to the dollar, while the US maintained official dollar-gold convertibility until 1971. Under the Bretton Woods arrangement, the US government maintained an official gold-convertibility commitment for foreign monetary authorities at US$35 per troy ounce. Other participating currencies were pegged to the dollar within agreed bands. The arrangement became increasingly difficult to sustain as global dollar claims grew relative to US gold reserves."],
      ["What is a balance-of-payments crisis?","A period when a country's stock index rises quickly","A situation where a country struggles to meet external payment obligations or maintain its external position","A temporary fall in company profits",1,"Such crises can involve depleted foreign-exchange reserves, capital outflows and pressure on the exchange rate. A balance-of-payments crisis concerns a country's ability to finance payments with the rest of the world. It may involve a sudden stop in capital inflows, pressure on reserves, exchange-rate stress or difficulty rolling over external debt. It is different from a company's cash-flow problem, although both involve funding pressure."],
      ["What is the key difference between fiscal and monetary policy?","Fiscal policy is set by stock exchanges; monetary policy by insurers","They are two names for income tax","Fiscal policy concerns government spending and taxation; monetary policy concerns money, credit and interest-rate conditions",2,"Governments use budgets and taxes for fiscal policy, while central banks use monetary tools for monetary policy. Fiscal decisions are made through government budgets, spending and taxation, while monetary policy is usually conducted by a central bank through interest rates and other tools. The two interact: government borrowing can affect financial conditions, and monetary policy can change the cost of servicing public debt."],
      ["What does a yield curve plot?","Bond yields across different maturities","A company's profit by department","Daily currency trades by country",0,"A yield curve commonly plots yields on similar-quality bonds against their time to maturity. Investors use the yield curve to compare borrowing costs at different maturities. A normal upward-sloping curve often reflects higher yields for longer lending periods, while an inverted curve has shorter yields above longer yields. Its shape can reflect expectations about future interest rates, inflation and economic activity."],
      ["What is duration used to estimate in bond investing?","The number of days until a stock exchange opens","A bond's sensitivity to changes in interest rates","The number of shareholders a company has",1,"Duration measures the timing of a bond's cash flows and is commonly used to estimate price sensitivity to yield changes. Duration is not simply the number of years remaining until a bond matures. It reflects the timing and present value of cash flows and helps estimate how sensitive a bond's price is to yield changes. As a general rule, a higher duration means greater price sensitivity to a given change in yields."],
      ["What is a collateralised debt obligation (CDO)?","A government budget document","A type of central-bank currency","A structured security backed by a pool of debt obligations",2,"CDOs package pools of debt and divide their cash flows and risks into tranches. Some mortgage-linked CDOs were central to the 2008 crisis. CDOs divide cash flows from a pool of debt into slices, often called tranches, with different priorities and risk levels. Their complexity made it difficult for some investors to understand the underlying mortgage risks before the 2008 crisis. Structured products are not inherently identical; the collateral and design matter."],
      ["What does sterilised foreign-exchange intervention mean?","A central bank offsets the domestic-money-supply effect of its FX intervention","A country bans all foreign investment","A government converts every bond into cash",0,"Sterilisation uses domestic operations to offset the liquidity impact of buying or selling foreign currency. When a central bank buys foreign currency, it typically supplies domestic currency, which can affect local liquidity. Sterilisation offsets that effect—for example, by selling domestic securities or using other operations. The aim is to influence the exchange rate while limiting the change in the domestic monetary base."],
      ["What is the principal purpose of the Basel framework?","To harmonise company dividend policies","To set international standards for bank capital, liquidity and risk supervision","To decide national minimum wages",1,"Basel standards provide a global framework for bank prudential regulation, implemented through national rules. The Basel standards are developed by the Basel Committee on Banking Supervision and are implemented through national regulators. They set internationally agreed minimum expectations, including capital and liquidity standards, to make banks more resilient. They do not replace domestic law, and implementation details can differ by jurisdiction."],
      ["What is a negative-yielding bond?","A bond that has no maturity date","A bond that cannot be traded","A bond whose yield to maturity is below zero at its market price",2,"An investor paying more than the total nominal cash flows may lock in a negative yield if held to maturity, assuming payments occur. A negative YTM means the bond's purchase price is high relative to its promised cash flows, producing a negative annualised return if held to maturity under the calculation's assumptions. Investors may still hold such bonds for liquidity, collateral, regulatory or safety reasons, or because they expect yields to fall further."],
      ["What is moral hazard in finance?","When protection from losses encourages risk-taking because someone else bears part of the cost","When a market has too many buyers","When inflation is exactly zero",0,"For example, an institution may take greater risks if it expects to be rescued from the consequences. Moral hazard arises when a party takes more risk because it does not bear the full consequences. It can appear in lending, insurance and financial rescues. Good regulation and contract design try to reduce these incentives while recognising that not every safety net automatically creates reckless behaviour."],
      ["What does a bank's capital adequacy ratio broadly compare?","Its number of branches with staff count","Its regulatory capital with risk-weighted assets","Its deposits with the country's GDP",1,"The ratio measures capital available to absorb losses relative to the risk-weighted assets on a bank's balance sheet. Risk-weighted assets assign different weights to exposures according to regulatory risk rules. The capital adequacy ratio compares qualifying regulatory capital with those risk-weighted assets, giving a view of the bank's loss-absorbing buffer. It is one important measure, but it does not capture every aspect of a bank's financial health."],
      ["What is a currency peg?","A rule that makes all imports tax-free","A guarantee that a currency never changes value","A policy linking a currency's value to another currency or a reference",2,"A peg can help stabilise exchange rates but may require reserves and policy choices to defend it. A peg can be maintained through foreign-exchange intervention, interest-rate policy, capital controls or a combination of tools. It may reduce exchange-rate uncertainty, but defending it can become costly if market pressure is strong or reserves are limited. A peg is a policy choice, not a promise that the rate can never change."],
      ["What is duration gap analysis used for by banks?","Assessing how changes in interest rates may affect the value of assets and liabilities differently","Counting how many loans mature each day only","Calculating employee bonuses",0,"Banks compare the interest-rate sensitivity of assets and liabilities to understand potential effects on economic value and earnings. Interest-rate changes affect assets and liabilities differently depending on their repricing dates, maturities and cash-flow features. A duration gap helps banks assess this mismatch and how it may change the economic value of equity. It is a risk-management tool, not a precise forecast of future profits."],
      ["What does a sovereign credit default swap (CDS) spread generally signal?","The country's annual GDP growth","The market price of protection against the sovereign's credit default risk","The country's official exchange rate",1,"A wider CDS spread often indicates that investors demand more compensation to insure against a credit event, though spreads have other drivers too. A CDS is a contract in which protection is bought against specified credit events. The spread is the periodic price of that protection and is often watched as a market signal of perceived credit risk. It is not a perfect probability of default because liquidity, contract terms and risk appetite also influence pricing."],
      ["What is the impossible trinity (trilemma) in international macroeconomics?","A country cannot have exports, imports and savings at once","A country must always use a single currency","A country cannot simultaneously maintain a fixed exchange rate, free capital movement and independent monetary policy",2,"The trilemma says policymakers can sustainably choose only two of these three objectives at the same time. The trilemma explains a basic constraint in open-economy policy. With free capital movement, attempts to hold a fixed exchange rate can limit a central bank's ability to set interest rates independently. Countries choose different combinations depending on their institutions, economic priorities and exposure to international capital flows."]
    ]
  };
  const COMMENTS = [
    "A brave first expedition. The markets remain mysterious, but so does the universe. ♡",
    "The finance gremlins won this round. We go again?",
    "A little market turbulence. Nothing a curious mind can't handle.",
    "The calculator is concerned. Divy says keep practising.",
    "Not your finest earnings season, but definitely a learning season.",
    "Some answers landed. Some took a detour through the Bermuda Triangle.",
    "You're getting there. The financial newspapers are starting to recognise you.",
    "A respectable performance. Your imaginary portfolio is cautiously optimistic.",
    "Look at you, making sensible financial noises!",
    "Solid work! Divy is considering giving you the office calculator.",
    "Very nice. You might actually understand the business section now.",
    "That's a strong score. The finance vocabulary is vocabulary-ing.",
    "Excellent! Someone's been paying attention in the imaginary boardroom.",
    "Almost flawless. Divy has stopped checking your answers over your shoulder.",
    "14/15?! The one wrong answer is clearly a clerical error. (Probably.)",
    "OMG, we have our finance wizard hereeee! Please don't start charging us consultation fees."
  ];
  const $ = (id) => document.getElementById(id);
  let mode = null, questions = [], index = 0, score = 0, answered = false, answers = [];
  const modeNames = {easy:"Easy",medium:"Medium",hard:"Hard"};
  function showPanel(name) {
    ["quiz-intro","quiz-play","quiz-result"].forEach(id => $(id).hidden = id !== name);
  }
  function startQuiz(level) {
    mode = level; questions = QUIZZES[level].slice(); index = 0; score = 0; answered = false; answers = [];
    showPanel("quiz-play"); renderQuestion();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function renderQuestion() {
    const q = questions[index];
    $("quiz-level-label").textContent = modeNames[mode] + " mode";
    $("quiz-question-count").textContent = "QUESTION " + String(index+1).padStart(2,"0") + " / 15";
    $("quiz-progress-fill").style.width = ((index/15)*100) + "%";
    $("quiz-question").textContent = q[0];
    $("quiz-options").innerHTML = q[1] ? [q[1],q[2],q[3]].map((v,i) =>
      '<button class="quiz-option" type="button" data-answer="'+i+'"><span class="quiz-option-letter">'+String.fromCharCode(65+i)+'</span><span>'+v+'</span></button>'
    ).join("") : "";
    $("quiz-feedback").hidden = true;
    $("quiz-next").hidden = true;
    $("quiz-next").textContent = index === 14 ? "See my score ↗" : "Next question →";
    answered = false;
  }
  function chooseAnswer(choice) {
    if(answered) return;
    answered = true;
    const q = questions[index], correct = choice === q[4];
    if(correct) score++;
    answers.push({question:q[0],chosen:choice,correct:q[4]});
    if(index === 14) {
      finishQuiz();
      return;
    }
    index++;
    renderQuestion();
  }
  function answerReviewMarkup() {
    return answers.map((answer,i) => {
      const q=questions[i], chosenLabel=q[1+answer.chosen], correctLabel=q[1+answer.correct];
      const isRight=answer.chosen===answer.correct;
      return '<article class="quiz-review-item '+(isRight?'is-right':'is-wrong')+'">'+
        '<div class="quiz-review-top"><span>QUESTION '+String(i+1).padStart(2,'0')+'</span><strong>'+(isRight?'RIGHT ✓':'NOT QUITE ✕')+'</strong></div>'+
        '<h3>'+q[0]+'</h3>'+
        '<p class="quiz-review-answer"><span>Your answer</span><b>'+chosenLabel+'</b></p>'+
        (isRight?'':'<p class="quiz-review-answer quiz-review-correct"><span>Correct answer</span><b>'+correctLabel+'</b></p>')+
        '<p class="quiz-review-explanation">'+q[5]+'</p>'+
      '</article>';
    }).join('');
  }
  function scoreComment(n) {
    if(n===15) return COMMENTS[15];
    if(n===14) return COMMENTS[14];
    return COMMENTS[n];
  }
  function finishQuiz() {
    showPanel("quiz-result");
    $("quiz-score").textContent = score + "/15";
    $("quiz-score-mode").textContent = modeNames[mode].toUpperCase() + " FINANCE QUIZ";
    $("quiz-score-comment").textContent = scoreComment(score);
    $("quiz-score-detail").textContent = score >= 12 ? "A brilliant run. Keep that curiosity switched on." : score >= 8 ? "A good base — a few more rounds and you'll be flying." : score >= 4 ? "You found a few gems. Now you know what to explore next." : "Every finance expert started by learning the basics. This is your origin story.";
    $("quiz-progress-fill").style.width = "100%";
    $("quiz-review-list").innerHTML = answerReviewMarkup();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function downloadScore() {
    const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 1500;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff5f1"; ctx.fillRect(0,0,1200,1500);
    ctx.strokeStyle = "#d79aaa"; ctx.lineWidth = 8; ctx.strokeRect(42,42,1116,1416);
    ctx.fillStyle = "#f5dde1"; ctx.beginPath(); ctx.arc(1000,180,115,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "#a64f70"; ctx.font = "bold 34px Georgia"; ctx.textAlign = "center";
    ctx.fillText("WORLD RATIO",600,190);
    ctx.fillStyle = "#542d40"; ctx.font = "bold 86px Georgia"; ctx.fillText("FINANCE QUIZ",600,370);
    ctx.fillStyle = "#a64f70"; ctx.font = "32px Georgia"; ctx.fillText(modeNames[mode].toUpperCase()+" EDITION",600,440);
    ctx.fillStyle = "#f5dde1"; ctx.beginPath(); ctx.roundRect(190,520,820,390,54); ctx.fill();
    ctx.fillStyle = "#a64f70"; ctx.font = "bold 210px Georgia"; ctx.fillText(score+"/15",600,790);
    ctx.fillStyle = "#542d40"; ctx.font = "italic 38px Georgia";
    wrapCanvasText(ctx,scoreComment(score),600,1010,900,56);
    ctx.fillStyle = "#805c6b"; ctx.font = "28px Georgia"; ctx.fillText("See who in your friend group should handle the finances.",600,1220);
    ctx.fillText("yashinigami.github.io/World-Ratio/#quiz",600,1330);
    const link = document.createElement("a"); link.download = "world-ratio-"+mode+"-quiz-score.png"; link.href = canvas.toDataURL("image/png"); link.click();
  }
  function wrapCanvasText(ctx,text,x,y,maxWidth,lineHeight) {
    const words=text.split(" "); let line="",lineNo=0;
    words.forEach(word=>{const test=line?line+" "+word:word;if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,y+lineNo*lineHeight);line=word;lineNo++;}else line=test;});
    if(line)ctx.fillText(line,x,y+lineNo*lineHeight);
  }
  async function copyQuizLink() {
    const url = window.location.origin + window.location.pathname + "#quiz";
    try { await navigator.clipboard.writeText(url); $("quiz-link-status").textContent="Link copied! Send it to your group chat and let the chaos begin. ♡"; }
    catch (_) { const input=document.createElement("textarea");input.value=url;document.body.appendChild(input);input.select();document.execCommand("copy");input.remove();$("quiz-link-status").textContent="Quiz link copied — now go challenge someone. ♡"; }
  }
  function resetQuiz() { showPanel("quiz-intro"); window.scrollTo({top:0,behavior:"smooth"}); }
  document.addEventListener("click", e => {
    const modeButton=e.target.closest("[data-quiz-mode]");
    if(modeButton){startQuiz(modeButton.dataset.quizMode);return;}
    const option=e.target.closest("[data-answer]");
    if(option){chooseAnswer(Number(option.dataset.answer));return;}
    if(e.target.closest("#quiz-next")){if(index===14)finishQuiz();else{index++;renderQuestion();}return;}
    if(e.target.closest("#quiz-download")){downloadScore();return;}
    if(e.target.closest("#quiz-copy-link")){copyQuizLink();return;}
    if(e.target.closest("#quiz-again") || e.target.closest("#quiz-exit")){resetQuiz();return;}
  });
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("quiz-play")&&!$("quiz-play").hidden)resetQuiz();});
  document.addEventListener("DOMContentLoaded",()=>{ if(location.hash==="#quiz") showPanel("quiz-intro"); });
  if(document.readyState!=="loading" && $("quiz-intro")) showPanel("quiz-intro");
})();