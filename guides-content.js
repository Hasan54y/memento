// Guides at /guides/: long-form help articles that go with the tools. Bodies are HTML;
// [[tool:slug]] becomes a box linking to that tool, [[ad]] an ad placement (build.js).
module.exports = [
  {
    slug: "passport-photo-size-by-country",
    title: "Passport photo size by country",
    h1: "Passport and visa photo sizes by country",
    seo: "Passport Photo Size by Country: US, UK, Schengen, Canada, Australia | Memento Tools",
    description: "Exact passport and visa photo sizes for the US, UK, Schengen, Canada, Australia, India and China: photo size, head size, background, and the digital pixel sizes for online forms.",
    icon: "badge", color: "#5ab8ff", tools: ["passport-photo", "photo-signature-resizer"],
    updated: "2026-10-08",
    body: `
<p>Most rejected passport photos aren't blurry or badly lit. They fail on measurements: the head is a few millimetres too small, the photo is the wrong shape, or the background is the wrong shade. The rules are strict because the photo has to work with face-matching systems at border control, so an official won't let a near miss through.</p>
<p>Below are the sizes for the countries people ask about most, what "head size" actually means, and how to take a photo at home that passes.</p>

<h2>Sizes at a glance</h2>
<div class="g-table"><table>
<thead><tr><th>Document</th><th>Photo size</th><th>Head (chin to crown)</th><th>Background</th></tr></thead>
<tbody>
<tr><td>United States passport and visa</td><td>2 × 2 in (51 × 51 mm)</td><td>1 to 1⅜ in (25–35 mm)</td><td>White or off-white</td></tr>
<tr><td>United Kingdom passport</td><td>35 × 45 mm</td><td>29–34 mm</td><td>Plain cream or light grey</td></tr>
<tr><td>Schengen visa, most EU passports</td><td>35 × 45 mm</td><td>32–36 mm</td><td>Plain and light (light grey is common)</td></tr>
<tr><td>Canada passport</td><td>50 × 70 mm</td><td>31–36 mm</td><td>Plain white or light-coloured</td></tr>
<tr><td>Australia passport</td><td>35–40 × 45–50 mm</td><td>32–36 mm</td><td>Plain white or light grey</td></tr>
<tr><td>India visa</td><td>2 × 2 in (51 × 51 mm)</td><td>25–35 mm</td><td>White</td></tr>
<tr><td>China visa</td><td>33 × 48 mm</td><td>28–33 mm (head width 15–22 mm)</td><td>White</td></tr>
</tbody>
</table></div>
<p class="g-small">35 × 45 mm with a 32–36 mm head is the international (ICAO) layout, so if your country isn't listed, that's the most likely size. Always check the issuing office's own page before you print: rules do change.</p>

<h2>What "head size" really means</h2>
<p>This is where most home-made photos go wrong. Head size is measured from the bottom of the chin to the top of the head, the crown. It's not measured to the eyebrows or the hairline, and it doesn't include a big hairstyle sticking up above the skull. If your hair is voluminous, the crown is roughly where the top of your skull would be.</p>
<p>On a 35 × 45 mm photo, a 32–36 mm head fills about 70–80% of the height. That's much closer than most people expect. A typical phone snapshot, cropped to the right shape, leaves the head at maybe half the height, which is too small. On a US 2 × 2 inch photo the head takes 50–69% of the height, so there's a bit more room around it.</p>
<p>The eyes matter too. The US asks for the eyes to sit between 1⅛ and 1⅜ inches from the bottom of the photo, which in practice means a bit above the middle.</p>

<h2>Rules nearly every country shares</h2>
<ul>
<li><b>Recent.</b> Taken in the last six months, showing how you look now.</li>
<li><b>Neutral face.</b> Mouth closed, eyes open, looking straight at the camera. A slight natural smile is fine for the US; most others want no smile.</li>
<li><b>Even light.</b> No shadows on the face or behind the head, no shine on the forehead, no red eyes.</li>
<li><b>No filters or retouching.</b> Phone beauty modes count. Turn them off.</li>
<li><b>Glasses.</b> The US doesn't accept glasses at all, except with a medical statement. The UK asks you to take them off if you can. Elsewhere they're usually allowed if there's no glare and the frames don't cover the eyes, but taking them off is the safe choice.</li>
<li><b>Head coverings</b> only for religious or medical reasons, with the full face visible from the bottom of the chin to the top of the forehead.</li>
</ul>

<h2>Taking the photo at home</h2>
<p>You don't need a studio, but you do need a second person. Selfies are taken at arm's length with a wide-angle lens, which makes the nose look bigger and the ears smaller. Photo checkers and officials notice.</p>
<ol>
<li>Stand about half a metre in front of a plain, light wall. Standing away from the wall keeps your shadow off it.</li>
<li>Face a window during the day, so the light falls evenly on your face. Avoid overhead lamps; they put shadows under the eyes.</li>
<li>Ask someone to stand about 1.5 metres away and hold the phone at your eye level. Use the back camera, and its 2× lens if it has one.</li>
<li>Take several shots. Pick one where both ears show evenly and your shoulders are level.</li>
</ol>
<p>Then crop it to the exact size with the right head size. That's the fiddly part, and it's what our passport photo maker does for you: it finds your face, sets the head size for the country you pick, and can swap the background for plain white or grey.</p>
[[tool:passport-photo]]

<h2>Printing it</h2>
<p>Don't print a single photo on a full sheet. Order a standard 4 × 6 inch (10 × 15 cm) print at a pharmacy or photo kiosk, with several passport photos laid out on it. Six US photos or eight 35 × 45 mm photos fit on one, and it usually costs less than a single photo at a studio.</p>
<p>The one thing to check is scaling. The print must come out at 100%. If an app or printer "fits to page", every photo shrinks and the head size is wrong again. After printing, measure one photo with a ruler before you cut them out.</p>
[[ad]]

<h2>Digital photos for online applications</h2>
<p>Online forms usually want a file rather than a print, and they set pixel and file-size limits instead of millimetres:</p>
<ul>
<li><b>US visa (DS-160):</b> a square JPEG, at least 600 × 600 and at most 1200 × 1200 pixels, no bigger than 240 KB.</li>
<li><b>UK passport online:</b> at least 600 pixels wide and 750 pixels tall.</li>
<li><b>Exam and job portals</b> often ask for something like 200 × 230 pixels under 50 KB, plus a signature at its own size.</li>
</ul>
<p>Keep the original, high-quality photo, and make a smaller copy for each form. Squeezing one file down again and again makes it blotchy, and some systems reject photos that look over-compressed.</p>
[[tool:photo-signature-resizer]]

<h2>Official pages</h2>
<p>Requirements in this guide were current when we wrote it, but the issuing office always has the final word. Before you submit, check:</p>
<ul>
<li>United Kingdom: <a href="https://www.gov.uk/photos-for-passports" rel="noopener">gov.uk/photos-for-passports</a></li>
<li>United States: <a href="https://travel.state.gov/" rel="noopener">travel.state.gov</a> (Passports, then Photos)</li>
<li>Canada: <a href="https://www.canada.ca/" rel="noopener">canada.ca</a> (Canadian passports, then Passport photos)</li>
<li>Australia: <a href="https://www.passports.gov.au/" rel="noopener">passports.gov.au</a> (Photo guidelines)</li>
<li>Schengen visas: the website of the embassy or visa centre you're applying through</li>
</ul>
`,
  },

  {
    slug: "spot-a-fake-bank-statement",
    title: "How to spot a fake bank statement",
    h1: "How to tell if a bank statement or payslip has been edited",
    seo: "How to Spot a Fake or Edited Bank Statement (PDF and Photo) | Memento Tools",
    description: "Practical checks for landlords, employers and lenders: the arithmetic, the fonts, what's hidden in the PDF's properties, and what to do if a document looks edited.",
    icon: "plagiarism", color: "#8b7bff", tools: ["tamper-check"],
    updated: "2026-10-08",
    body: `
<p>Editing a PDF is easy now. A free online editor can change an amount, a name or a date in a couple of minutes, and the result often looks fine at a glance. If you rent out a flat, hire people, lend money or sell anything expensive, sooner or later someone will send you a document that isn't what it claims to be.</p>
<p>The good news is that edits leave traces. None of the checks below proves anything on its own, but together they tell you whether a document deserves a closer look.</p>

<h2>Start with how you received it</h2>
<p>A screenshot, a phone photo of a printout or a PDF that was "printed to PDF" has already lost most of the evidence. Ask for the statement exactly as it was downloaded from online banking. If the person can't or won't send that, it's worth asking why.</p>
<p>Even better is getting it from the source. Many banks will send a stamped statement or a balance letter on request, and some can confirm details directly with the person's consent. A short call to the employer's HR department settles a payslip in a minute.</p>

<h2>Check the arithmetic</h2>
<p>This catches a surprising number of edits, because changing one figure means changing every figure that depends on it, and people forget.</p>
<ul>
<li>Opening balance, plus money in, minus money out, should equal the closing balance.</li>
<li>If the statement has a running balance column, check a few rows in the middle, not just the first and last.</li>
<li>On a payslip, gross pay minus each deduction should equal net pay, and the year-to-date totals should grow by about one month's pay from one payslip to the next.</li>
<li>Look at the salary credit. Does the amount on the statement match the net pay on the payslip, and does it arrive on a sensible day each month?</li>
</ul>

<h2>Look closely at the page</h2>
<p>Zoom in to 200% or more. Edited text tends to sit slightly differently from the original:</p>
<ul>
<li><b>Fonts.</b> A changed number is often in a font that's almost, but not quite, the same: the 1 has a different foot, or the 7 a different angle.</li>
<li><b>Alignment.</b> Numbers in a column should line up on the decimal point. One amount sitting a pixel higher, lower or further left is a classic sign.</li>
<li><b>Spacing and weight.</b> Inserted text can look slightly bolder, lighter or more tightly spaced than its neighbours.</li>
<li><b>Background.</b> On scans and photos, a patch that's cleaner or a slightly different white than the paper around it suggests something was covered and retyped.</li>
<li><b>Details that should match.</b> Account number format, sort code or branch, statement period, page numbers ("page 2 of 3") and the address should all agree with each other and with what you know.</li>
</ul>

<h2>Look inside the PDF</h2>
<p>A PDF carries information you can't see on the page. Open it in a PDF reader and look at the document properties (in most readers: File, then Properties).</p>
<ul>
<li><b>Producer and creator.</b> Statements generated by a bank usually name a reporting or document system. Names like iLovePDF, Smallpdf, Sejda, PDFescape, Canva, Microsoft Word or an image editor mean the file passed through software people use to make or change documents.</li>
<li><b>Dates.</b> Compare the creation date with the modified date. A statement created at the bank on the 1st and modified two weeks later was opened and saved again somewhere.</li>
<li><b>Fonts.</b> The fonts tab lists every font in the file. A bank statement usually uses one or two families. An extra font that only appears in a handful of characters is worth finding on the page.</li>
<li><b>Saves.</b> PDFs can be saved "incrementally", with each change added to the end of the file. A statement saved several times after it was created has been through more hands than a bank's system.</li>
</ul>
<p>Our document tamper check reads all of this for you, and marks text in an odd font in red on the page itself. It runs in your browser, so you're not uploading someone's bank details anywhere.</p>
[[tool:tamper-check]]
[[ad]]

<h2>Photos and scans</h2>
<p>When you only have a photo, there's less to go on. Two things still help. The photo's hidden details (EXIF) may name editing software such as Photoshop, or show it was saved again long after it was taken. And error level analysis, which re-saves the image and shows where it changes most, can make a pasted-in number or name stand out from the rest of the page. Treat it as a hint: edges and sharp text always glow a little.</p>

<h2>Innocent explanations</h2>
<p>Before drawing conclusions, remember that genuine documents get these marks too:</p>
<ul>
<li>Filling in or signing a PDF form adds a save and sometimes a new font.</li>
<li>Merging several statements into one file, or compressing it to email it, changes the producer.</li>
<li>Some banks really do generate statements with tools that add later saves, and some staff do save letters from Word.</li>
<li>A statement printed and scanned at an office has no useful PDF details at all.</li>
</ul>
<p>Treat a warning as a reason to verify, not as proof of fraud.</p>

<h2>If something doesn't add up</h2>
<p>Don't accuse anyone on the strength of a font or a date. Ask for the document again, sent directly from the bank or employer, or for a short letter confirming the figure that matters to you. A genuine applicant will usually arrange that quickly. If the explanations get complicated, or the new copy shows different numbers, you have your answer.</p>
<p>For larger sums (a loan, a tenancy deposit, a vehicle sale) it's reasonable to make direct verification a standard step for everyone. Then nobody feels singled out.</p>
`,
  },

  {
    slug: "compress-pdf-for-online-applications",
    title: "Get a PDF under 100 KB or 200 KB",
    h1: "How to get a PDF under 100 KB or 200 KB for an online application",
    seo: "How to Reduce a PDF to 100 KB or 200 KB for Online Applications | Memento Tools",
    description: "Why application portals reject your PDF, what actually makes a PDF big, and step-by-step ways to get under 100 KB, 200 KB or 500 KB while keeping it readable.",
    icon: "compress", color: "#8b7bff", tools: ["compress-pdf", "image-to-pdf", "split-pdf"],
    updated: "2026-10-08",
    body: `
<p>University portals, job sites and government forms love tight upload limits: 100 KB for a certificate, 200 KB for an ID, 500 KB for a whole application. Then you scan a single page on your phone and the file comes out at 4 MB.</p>
<p>The limit isn't arbitrary. Portals keep thousands of applications, and a reviewer has to open them quickly. You can almost always get under it without making the document unreadable, as long as you know where the size is coming from.</p>

<h2>What makes a PDF big</h2>
<p>Text is tiny. A ten-page letter typed in Word and saved as PDF is often under 100 KB already. Size comes from images, and in documents people upload, the images are usually the pages themselves: photos or scans of certificates, IDs and mark sheets.</p>
<p>A modern phone photo is 12 megapixels or more. That's far more detail than a reviewer needs to read an A4 page, and it's stored in colour even when the page is black text on white paper. So the job is nearly always the same: make each page image smaller in pixels, store it in a way that suits the content, and leave out anything that doesn't need to be there.</p>

<h2>If you're starting from photos</h2>
<p>Don't make a huge PDF and then shrink it. Build the PDF at the right size in the first place.</p>
<ol>
<li><b>Take the photo square-on</b>, in daylight, with the page filling the frame. A tilted page wastes pixels on the table around it.</li>
<li><b>Crop to the paper.</b> Margins of carpet and fingers are still pixels.</li>
<li><b>Think about colour.</b> Certificates with a coloured seal should stay in colour, but plain text pages compress much better in black and white. If the file is still too big, run it through Compress PDF with "Black &amp; white" ticked.</li>
<li><b>Set the limit before you save.</b> Our image to PDF tool takes your photos and a target such as 200 KB, and lowers the quality step by step until the whole file fits.</li>
</ol>
[[tool:image-to-pdf]]

<h2>If you already have the PDF</h2>
<p>Run it through a compressor with a target size rather than a vague "high/medium/low" setting. Ours re-draws each page as an image and keeps trying smaller sizes until the file is under your limit, so you can type 100 and get a file under 100 KB, or the closest it can get while still readable. For pages that are just black text, tick "Black &amp; white" as well; plain text pages get noticeably smaller in black and white.</p>
[[tool:compress-pdf]]
<p>Two things to know about that approach. The pages become images, so the text can no longer be selected or searched; for an upload that's normally fine. And if the PDF is already mostly text, compressing it this way can make it bigger, not smaller. If a text-only PDF is over the limit, the cause is usually an embedded high-resolution logo or a scanned signature, and re-saving it from the original program at a lower image quality fixes it.</p>
[[ad]]

<h2>When it still won't fit</h2>
<p>Some combinations are simply impossible. Ten scanned pages under 100 KB means about 10 KB per page, which is too little for anyone to read small print. When you hit that wall:</p>
<ul>
<li><b>Upload only the pages they asked for.</b> If the form wants your passport's photo page, send that page, not the whole passport. Split the PDF and keep what's needed.</li>
<li><b>Check whether the portal allows several files.</b> Many accept one file per document type.</li>
<li><b>Lower the resolution before the quality.</b> An A4 page at around 1000 pixels wide is still readable on screen; at 600 it starts to struggle.</li>
</ul>
[[tool:split-pdf]]

<h2>Check before you upload</h2>
<p>After compressing, open the file and zoom to 100%. Can you read the smallest text that matters: the registration number, the date of birth, the grade? If you can't, the reviewer can't either, and an unreadable document can get an application rejected just like a missing one.</p>
<p>A few other things trip people up:</p>
<ul>
<li><b>Passwords.</b> Portals usually can't open protected PDFs. Remove the password before uploading.</li>
<li><b>File names.</b> Some older systems choke on spaces and symbols. "ssc-certificate.pdf" is safer than "SSC Certificate (final) #2.pdf".</li>
<li><b>File type.</b> If the form says PDF, a JPG renamed to .pdf won't work. Convert it properly.</li>
<li><b>Keep the original.</b> Save the full-quality file somewhere safe. You'll need it the next time a form asks for a different limit.</li>
</ul>

<h2>Why our tools work in the browser</h2>
<p>Certificates, IDs and mark sheets are exactly the kind of documents you shouldn't upload to a random website just to make them smaller. Every Memento tool processes files on your own device: nothing is sent to a server, so there's nothing for anyone to keep.</p>
`,
  },

  {
    slug: "leave-passwords-to-family",
    title: "Leave your passwords to your family",
    h1: "How to leave your passwords and crypto recovery phrase to your family, safely",
    seo: "How to Leave Passwords and a Crypto Recovery Phrase to Your Family Safely | Memento Tools",
    description: "A practical plan for making sure your family can reach your accounts and crypto if something happens to you, without writing everything on one piece of paper anyone could find.",
    icon: "key", color: "#ffb547", tools: ["secret-splitter", "encrypt-files"],
    updated: "2026-10-08",
    body: `
<p>If you died or ended up in hospital tomorrow, could your family get into your email, your phone, your bank accounts or your crypto wallet? For most people the honest answer is no. Everything is behind passwords that live only in their head or in a password manager nobody else can open.</p>
<p>The obvious fix, writing everything down and putting it in a drawer, creates the opposite problem. Anyone who finds the paper has everything. A good plan sits between the two: your family can get in when they need to, and nobody can get in before that.</p>

<h2>Use the built-in options first</h2>
<p>Several big services already have a way to hand over access, and they're the cleanest route because the service itself checks that the request is genuine:</p>
<ul>
<li><b>Google</b> has Inactive Account Manager: if your account goes unused for a period you choose, it can notify people you've picked and share selected data with them.</li>
<li><b>Apple</b> lets you add a Legacy Contact, who can request access to your iCloud data with an access key and a death certificate.</li>
<li><b>Facebook</b> lets you choose a legacy contact to look after a memorialised account.</li>
<li><b>Password managers</b> often have emergency access. Bitwarden, for example, lets a trusted person request access, which is granted automatically if you don't decline within a waiting period you set.</li>
</ul>
<p>Set these up first. They cover a lot, and they don't need you to write any password down.</p>

<h2>What's left: the master keys</h2>
<p>Some things have no recovery process at all. A crypto wallet's recovery phrase (the 12 or 24 words) is the clearest case: whoever has it has the money, and if it's lost, the money is gone. The same goes for a password manager's master password, a phone PIN, or the combination of a home safe.</p>
<p>These are the secrets worth planning properly, and the main choices are below.</p>

<h3>A sealed letter with someone you trust</h3>
<p>Simple, and fine for small amounts. The weakness is that one person, or anyone who gets to their drawer, holds everything. Don't put the secrets themselves in your will: in some places, such as England and Wales, a will becomes a public document after probate.</p>

<h3>An encrypted file, with the password kept apart</h3>
<p>Put the instructions and the secrets in an encrypted file, give copies of the file to family, and keep the password separately, for example with your lawyer. Neither half is useful on its own. Our encrypted document kit makes a single file that opens in any web browser with the password, so your family won't need special software.</p>
[[tool:encrypt-files]]

<h3>Split the secret into pieces</h3>
<p>This is the most robust option. A method called Shamir's secret sharing, published by the cryptographer Adi Shamir in 1979, splits a secret into several pieces so that a chosen number of them, and no fewer, can rebuild it. For example: three pieces, any two needed.</p>
<ul>
<li>Give one piece to your partner, one to a sibling and one to your lawyer.</li>
<li>Any one of them alone learns nothing at all, not even a hint of the secret.</li>
<li>Any two together can recover it, so losing one piece is not a disaster.</li>
</ul>
<p>Our secret splitter does exactly this, and prints each piece on its own page with a QR code and recovery instructions.</p>
[[tool:secret-splitter]]
[[ad]]

<h2>A note on typing a recovery phrase into a website</h2>
<p>Normally you should never type a wallet's recovery phrase into any website, and that advice stands. If you use a browser tool like ours for this, open the page, then turn off Wi-Fi and mobile data before typing the phrase. The splitter works fully offline once loaded, and nothing is sent anywhere, but going offline means you don't have to take our word for it. Close the tab when you're done.</p>
<p>For a large amount of crypto, also look at what your hardware wallet offers. Some, such as Trezor's Shamir Backup, can create split recovery shares on the device itself, so the phrase never touches a computer.</p>

<h2>Write the instructions, not just the secrets</h2>
<p>A recovery phrase is useless to someone who doesn't know what it is. Alongside the secrets, leave a plain-language note:</p>
<ul>
<li>A list of accounts that matter: banks, pensions, insurance, crypto exchanges and wallets, email, the domain names and subscriptions that would keep charging.</li>
<li>For each, what you'd want done: close it, transfer it, keep it running.</li>
<li>Who holds which piece, how many pieces are needed and where to recover them.</li>
<li>Who to call for help: your accountant, lawyer, or a technically minded friend.</li>
</ul>

<h2>Test it, then review it once a year</h2>
<p>Before handing anything out, recover the secret yourself from two of the pieces. It takes a minute and it's the only way to be sure the plan works. Then put a yearly reminder in your calendar to check the list: accounts change, people move, and a plan that was right three years ago may point to a wallet you emptied long ago.</p>
<p>It isn't a cheerful job. But an evening spent on it now saves the people you care about months of locked accounts and lost savings later.</p>
`,
  },

  {
    slug: "passport-six-month-rule",
    title: "The six-month passport rule",
    h1: "The six-month passport rule: how long your passport must be valid to travel",
    seo: "Six-Month Passport Rule Explained: Validity Rules by Destination | Memento Tools",
    description: "Why airlines turn people away with a valid passport, how the six-month, three-month and length-of-stay rules work, and which rule applies where you're going.",
    icon: "flight_takeoff", color: "#8b7bff", tools: ["passport-validity", "passport-photo"],
    updated: "2026-10-08",
    body: `
<p>Every year people get turned away at the check-in desk holding a passport that hasn't expired. It still had four months left, which felt like plenty for a ten-day holiday. The problem was the destination: it wanted at least six months.</p>
<p>The rule isn't about your trip at all. It's about the date your passport expires compared with the date you arrive or leave, and different countries count it differently.</p>

<h2>Three kinds of rule</h2>
<p>Almost every country uses one of these:</p>
<ul>
<li><b>Valid for six months from arrival.</b> On the day you land, the passport must have at least six months left. This is common in Asia and the Middle East. If your passport expires on 10 June, the last day you can arrive is 10 December of the year before.</li>
<li><b>Valid for a period after you leave.</b> The Schengen area counts three months from the day you plan to leave, not the day you arrive. Stay for a month and you need roughly four months left when you fly in.</li>
<li><b>Valid for the whole stay.</b> Some countries only ask that the passport doesn't expire while you're there. Even then, airlines and transit airports may want more, so a little extra margin is wise.</li>
</ul>

<h2>Popular destinations</h2>
<div class="g-table"><table>
<thead><tr><th>Destination</th><th>Rule for most visitors</th></tr></thead>
<tbody>
<tr><td>Schengen area (most of Europe)</td><td>Valid at least 3 months after you leave, and issued within the last 10 years</td></tr>
<tr><td>United States</td><td>Six months beyond your stay, though citizens of many countries are exempt and only need it valid for the stay</td></tr>
<tr><td>United Kingdom, Canada, Australia, Japan</td><td>Valid for the whole stay</td></tr>
<tr><td>UAE, Saudi Arabia, Qatar</td><td>At least 6 months from arrival</td></tr>
<tr><td>Singapore, Malaysia, Thailand, Indonesia</td><td>At least 6 months from arrival</td></tr>
<tr><td>India, China</td><td>At least 6 months from arrival</td></tr>
</tbody>
</table></div>
<p class="g-small">Rules depend on your nationality and the type of visa, and they change. Treat this as a starting point and confirm on the embassy's site or with your airline before you book.</p>

<h2>The ten-year catch in Europe</h2>
<p>The Schengen rule has a second part people miss: the passport must have been issued within the last ten years. Some countries used to add extra months to a passport when you renewed early, so a few passports are valid for more than ten years in total. For Schengen, the issue date counts, not just the expiry date.</p>

<h2>Why the airline cares more than the border</h2>
<p>Airlines check passports against an industry database of entry rules before you board, because if a country refuses you entry, the airline has to fly you back at its own cost. That makes check-in staff strict. Arguing that the rule "doesn't really apply" rarely works at the desk, even when you're right.</p>
<p>Connecting flights add their own rules. If your route goes through another country, especially one where you'd have to pass immigration to change terminals, check that country too.</p>
[[tool:passport-validity]]
[[ad]]

<h2>Other things that stop people boarding</h2>
<ul>
<li><b>Blank pages.</b> Some countries want one or two completely empty pages for stamps. South Africa, for example, asks for two.</li>
<li><b>Damage.</b> A torn photo page, water damage or a detached cover can make a passport invalid even if the date is fine.</li>
<li><b>A passport reported lost.</b> If you reported it lost and then found it, it's usually cancelled and can't be used.</li>
<li><b>Name changes.</b> Your ticket must match the passport you travel on. A marriage certificate doesn't fix a mismatch at check-in.</li>
</ul>

<h2>When to renew</h2>
<p>A simple habit avoids almost all of this: renew when your passport has about a year left. That keeps you clear of every six-month rule, and it gives you time if the passport office is slow. Processing times swing a lot by season, and summer is usually the busiest.</p>
<p>If you renew, you'll need new photos. Each country has its own size and head-size rules, and a rejected photo is the most common reason a renewal gets delayed.</p>
[[tool:passport-photo]]
`,
  },

  {
    slug: "safe-id-card-copy",
    title: "Share an ID copy safely",
    h1: "How to give someone a copy of your ID without risking identity theft",
    seo: "How to Make a Safe Copy of Your ID Card or Passport | Memento Tools",
    description: "Landlords, banks, employers and agents all ask for a copy of your ID. Here's how to give them one that's useful for its purpose and much harder to misuse.",
    icon: "id_card", color: "#ffb547", tools: ["id-copy", "encrypt-files"],
    updated: "2026-10-08",
    body: `
<p>A copy of your ID card or passport is one of the most useful things a fraudster can get. With a clear scan and a few personal details, people have opened bank accounts, rented flats and taken out phone contracts in someone else's name.</p>
<p>Yet you're asked for a copy all the time: by a letting agent, a new employer, a car rental desk, a visa agent. You often can't refuse. What you can do is make the copy less useful to anyone other than the person you meant it for.</p>

<h2>Ask whether a copy is really needed</h2>
<p>Sometimes it isn't. A shop or hotel might only need to see the ID, not keep it. If you're asked for a copy, it's fair to ask what it's for and how long they'll keep it. In much of the world, including the EU under the GDPR, organisations are only supposed to collect the personal data they actually need.</p>

<h2>Watermark it with the purpose and date</h2>
<p>This is the single most effective step. Across the copy, add a line such as:</p>
<p class="g-quote">Copy for Greenfield Lettings, rental application only, 8 October 2026</p>
<p>A copy marked like that is awkward to reuse. A bank or phone company receiving it would see straight away that it was made for someone else. Put the watermark over the card itself, not just in the margin, where it could be cropped off. Keep it light enough that the details are still readable; a copy nobody can read gets rejected.</p>

<h2>Black out what they don't need</h2>
<p>Look at what's on the card and what the receiver actually checks. Usually that's your name, photo, date of birth and the expiry date. Depending on the country, you can often hide:</p>
<ul>
<li>the document number, unless they specifically need it</li>
<li>a national identification or tax number printed on the card</li>
<li>the machine-readable lines at the bottom</li>
<li>your signature, if it isn't required</li>
</ul>
<p>Some organisations, such as banks checking identity by law, do need the full document. Ask before you black something out. The Netherlands even has an official government app, KopieID, built for exactly this: it lets you cover the citizen service number and add a purpose watermark.</p>
[[tool:id-copy]]

<h2>Make it a proper copy</h2>
<p>A blurry photo taken at an angle on a kitchen table gets rejected and you end up sending a second, better one, so now two copies exist. Do it once, properly:</p>
<ul>
<li>Photograph the card from straight above, on a surface that contrasts with it, with no glare on the photo.</li>
<li>Straighten and crop it so only the card shows.</li>
<li>If both sides are needed, put them on one page.</li>
<li>For printing, keep it at real size. ID cards and driving licences are 85.6 × 54 mm; a copy printed at "fit to page" comes out oversized and looks odd.</li>
</ul>
[[ad]]

<h2>Send it carefully</h2>
<p>Before you send anything, make sure the request is genuine. Scammers pose as landlords, recruiters and visa agents precisely to collect ID copies. Check the company exists, use contact details from its official website rather than the message you received, and be wary of anyone who wants your ID before you've seen a flat or had an interview.</p>
<p>Then think about where the copy will live. An email attachment sits in two mailboxes indefinitely. A "share with anyone who has the link" cloud folder can be opened by anyone the link reaches. If you're sending several documents, put them in a password-protected file and tell the password by phone.</p>
[[tool:encrypt-files]]

<h2>Keep track of who has a copy</h2>
<p>It sounds fussy, but a short note of who you gave copies to, and when, is very useful if your ID is ever misused. You'll know which leak to ask about, and you can ask organisations to delete copies once they no longer need them. If you lose the card itself, report it straight away so it's cancelled, and keep the police or report reference in case someone later uses it.</p>
`,
  },

  {
    slug: "make-a-photo-smaller-in-kb",
    title: "Make a photo smaller in KB",
    h1: "How to make a photo smaller in KB without it looking bad",
    seo: "How to Reduce Photo Size in KB Without Losing Quality | Memento Tools",
    description: "What decides how many KB a photo takes, why some images refuse to shrink, and how to hit limits like 50 KB, 100 KB or 200 KB while keeping the picture clear.",
    icon: "photo_size_select_small", color: "#2dd4bf", tools: ["compress-image", "photo-signature-resizer"],
    updated: "2026-10-08",
    body: `
<p>A phone photo straight from the camera is usually a few megabytes. An online form asks for under 100 KB. That's a reduction of thirty or forty times, and if you do it the wrong way the picture turns into a smudge of blocks.</p>
<p>Done the right way, most people can't tell the difference at the size the photo will actually be seen. It comes down to two settings that people tend to mix up.</p>

<h2>Pixels and quality are different things</h2>
<p><b>Pixels</b> are how many dots make up the picture, for example 4000 × 3000. <b>Quality</b> is how carefully those dots are stored. A JPG at quality 90 keeps fine detail; at 40 it throws a lot away and shows blocky patches around edges.</p>
<p>The size in KB depends on both, and pixels matter far more. Halving the width and height leaves a quarter of the pixels, and the file shrinks roughly in proportion, with no visible damage if the photo is shown small anyway. So the rule is simple:</p>
<ol>
<li>First reduce the pixels to what the photo really needs.</li>
<li>Then lower the quality only as far as necessary to hit the limit.</li>
</ol>
<p>A form photo displayed at 200 pixels wide gains nothing from being 4000 pixels wide. A photo for a website rarely needs more than 1920 pixels across.</p>

<h2>JPG, PNG or WebP?</h2>
<ul>
<li><b>JPG</b> is right for photos and accepted almost everywhere. It's the safe choice for forms and email.</li>
<li><b>PNG</b> stores every pixel exactly. That's ideal for screenshots and logos, but a photo saved as PNG stays huge. If a PNG photo won't shrink, convert it to JPG.</li>
<li><b>WebP</b> gives the smallest files for the same look, and every modern browser shows it. Use it for websites; many older forms don't accept it.</li>
</ul>
[[tool:compress-image]]
[[ad]]

<h2>Hitting an exact limit</h2>
<p>Trial and error with a quality slider gets tedious. A target-size setting does the search for you: give it 100 KB and it finds the highest quality that fits, and only reduces the pixels if quality alone can't get there.</p>
<p>Some practical points for forms:</p>
<ul>
<li><b>Use the largest size you're allowed.</b> If the limit is 20–50 KB, aim near 50, not 20. There's no prize for being far below.</li>
<li><b>Check the pixel size too.</b> Forms often want exact dimensions, such as 300 × 300 pixels, as well as a KB limit. Get the dimensions right first.</li>
<li><b>Crop before you compress.</b> Every pixel of background you crop away is space the important part can use.</li>
<li><b>Don't compress the same file twice.</b> Each round of JPG compression adds damage. Go back to the original whenever you need a new size.</li>
</ul>

<h2>Signatures need different treatment</h2>
<p>A signature is dark lines on white, not a photo. Sign with a dark pen on clean white paper, photograph it in daylight, crop tightly around the signature, and make the background pure white. A clean signature compresses to a few KB and stays sharp, while a grey, shadowy one balloons and looks smudged.</p>
[[tool:photo-signature-resizer]]

<h2>A bonus: location data</h2>
<p>Phone photos often contain hidden details, including the GPS position where they were taken. Sending a photo from home can share your address with whoever receives it. Re-saving a photo through a compressor that writes a fresh file, like ours, leaves that information behind.</p>

<h2>When it really won't fit</h2>
<p>If a photo still looks bad at the size you need, the limit is probably meant for a smaller image than you're giving it. Look again at the form's instructions: a "photo under 50 KB" usually expects a passport-style head-and-shoulders picture of a few hundred pixels, not a full-resolution shot.</p>
`,
  },

  {
    slug: "check-contract-changes-before-signing",
    title: "Check a contract before you sign",
    h1: "How to check what changed in a contract before you sign it",
    seo: "How to Compare Two Versions of a Contract Before Signing | Memento Tools",
    description: "The final version of a contract isn't always the one you agreed. How changes slip in, where to look, and how to compare two versions word by word in a few minutes.",
    icon: "difference", color: "#ff6b6b", tools: ["compare-documents", "tamper-check"],
    updated: "2026-10-08",
    body: `
<p>You negotiate a contract by email. A few drafts go back and forth, you agree on the terms, and then the final version arrives for signing: twelve pages, looking exactly like the last draft. Most people skim it and sign.</p>
<p>Usually that's fine. Occasionally a clause has changed: a notice period, a renewal term, a figure, a "not" added or removed. Sometimes it's a genuine slip from working on the wrong draft, sometimes it isn't. Either way, once you've signed, the change is yours.</p>

<h2>How changes go unnoticed</h2>
<ul>
<li><b>Tracked changes are hidden.</b> In Word, a document can contain tracked changes that don't show in some views. A "clean" copy may also have had changes accepted silently.</li>
<li><b>The final copy is a PDF.</b> Converting to PDF removes any record of edits. You see a finished document and nothing else.</li>
<li><b>The layout shifts.</b> When paragraphs move to a different page, comparing by eye becomes almost impossible.</li>
<li><b>Fatigue.</b> By the fifth draft, nobody reads every word again.</li>
</ul>

<h2>Compare, don't reread</h2>
<p>The reliable way is to compare the version you agreed with the version you're asked to sign, word by word, using software. It takes a minute and catches every changed word, including ones you'd never spot reading.</p>
<ol>
<li>Keep a copy of the last version you agreed, saved somewhere you won't overwrite.</li>
<li>When the signing copy arrives, compare it with that version.</li>
<li>Read every highlighted change in context. A comparison shows what changed; you still need to judge what it means.</li>
</ol>
<p>Our compare tool reads PDFs, Word files and plain text, so you can compare a Word draft against the PDF you were sent to sign. With "ignore spacing" on, re-wrapped lines and page breaks don't show up as changes, so only real wording differences are highlighted.</p>
[[tool:compare-documents]]
[[ad]]

<h2>Where changes matter most</h2>
<p>If you only have time to look closely at a few things, look at these:</p>
<ul>
<li><b>Numbers.</b> Prices, deposits, salaries, percentages, penalties and caps on liability.</li>
<li><b>Dates and periods.</b> Start date, minimum term, notice period, payment deadlines.</li>
<li><b>Renewal.</b> Whether the contract renews automatically, and how you can stop it.</li>
<li><b>Small words.</b> "May" versus "shall", "and" versus "or", "including" versus "limited to". These flip the meaning of a clause.</li>
<li><b>Names and parties.</b> The legal name of the company you're dealing with, and whether a different company has appeared.</li>
<li><b>Attachments.</b> Schedules and appendices are often updated separately and forgotten.</li>
</ul>

<h2>When there's no earlier version</h2>
<p>If you only have one document, a comparison isn't possible. You can still check that the file itself hasn't been edited since it was produced. A tamper check looks for later saves, editing software in the file's details and text in a different font from the rest, which is how altered figures often show up.</p>
[[tool:tamper-check]]

<h2>Scanned contracts</h2>
<p>A scanned or photographed contract is a picture of text, so there's nothing for software to compare. Ask for the digital file. If that's impossible, compare the two versions side by side, page by page, paying particular attention to the list above.</p>

<h2>If you find a change</h2>
<p>Don't assume bad faith. Point it out in writing, quote the clause from both versions and ask which one is intended. Most of the time it's corrected at once. If it isn't, you've learned something important before signing rather than after. For contracts that matter, such as employment, property or large purchases, a lawyer's review is still worth it; a comparison tool shows what changed, not whether a clause is fair.</p>
`,
  },

  {
    slug: "calculate-age-for-age-limit",
    title: "Work out your age for an age limit",
    h1: "How to work out your age for a job or exam age limit",
    seo: "How to Calculate Your Age for a Job or Exam Age Limit | Memento Tools",
    description: "Age limits are counted on a cut-off date, and the wording matters. How to read the rule, count your age correctly, and avoid a rejected application.",
    icon: "cake", color: "#ffb547", tools: ["age-calculator", "photo-signature-resizer"],
    updated: "2026-10-08",
    body: `
<p>Government jobs, entrance exams, scholarships and some visas set an age limit: "between 18 and 30 years", for example. It sounds simple until you're born in the wrong month and realise you might be 30 or 31 depending on how it's counted.</p>
<p>A wrong guess costs a lot. Apply when you're over the limit and the application is rejected, sometimes after you've paid the fee. Don't apply when you were actually eligible and you've missed the chance for another year.</p>

<h2>Find the cut-off date</h2>
<p>Age limits are almost never counted on the day you apply. The rules name a fixed date, often written as "age as on 1 January 2026" or "as on the closing date of the application". Everyone's age is measured on that same date, so it doesn't matter whether you apply on the first day or the last.</p>
<p>If you can't find a cut-off date in the notice, look in the detailed rules or the information bulletin rather than the short advertisement.</p>

<h2>Read the wording carefully</h2>
<p>These phrases sound alike but aren't:</p>
<ul>
<li><b>"Not more than 30 years"</b> usually means you can be 30 years and 0 days on the cut-off date, but not a day older.</li>
<li><b>"Below 30 years"</b> or <b>"under 30"</b> usually means you must not have reached your 30th birthday by the cut-off date.</li>
<li><b>"Must not have completed 30 years"</b> means the same as "under 30".</li>
<li><b>"Born on or after 2 January 1996"</b> is the clearest of all. Some notices give the birth-date range directly; if yours does, use that and ignore the rest.</li>
</ul>
<p>When the wording is genuinely unclear, ask the organisation in writing before you pay any fee.</p>

<h2>Count it properly</h2>
<p>Age is counted in whole years and months, then the remaining days, the way official forms do it. Someone born on 15 March 2000 is 25 years, 9 months and 17 days old on 1 January 2026. Counting with days divided by 365 gives slightly different answers because of leap years, which is exactly the wrong kind of error near a limit.</p>
[[tool:age-calculator]]
[[ad]]

<h2>Age relaxation</h2>
<p>Many public-sector recruitments allow extra years for certain groups, such as people with disabilities, former military personnel or particular social categories. The notice will say something like "upper age limit relaxable by 5 years". Add the relaxation to the maximum before checking, and make sure you have the certificate that proves you qualify; the relaxation usually depends on it.</p>

<h2>Born on 29 February?</h2>
<p>In years without 29 February, the birthday is usually taken as 28 February. Some rules use 1 March instead. If you're within a day of a limit, this is worth confirming with the organisation.</p>

<h2>Use the date on your documents</h2>
<p>The date of birth that counts is the one on the certificate you'll upload, usually a birth certificate or school certificate, not the one you celebrate. If your documents disagree with each other, sort that out first; a mismatch between the form and the certificate can sink an application even if your age is fine.</p>

<h2>While you're applying</h2>
<p>Age limits come with other fiddly requirements: a photo of an exact pixel size under a KB limit, a signature at another size, certificates as PDFs under 200 KB. Having those ready before the last day avoids the classic deadline-night scramble when the portal is slow.</p>
[[tool:photo-signature-resizer]]
`,
  },

  {
    slug: "combine-documents-into-one-pdf",
    title: "Put several documents into one PDF",
    h1: "How to combine certificates and scans into one PDF, and when to send images instead",
    seo: "How to Combine Documents Into One PDF (and Convert a PDF to JPG) | Memento Tools",
    description: "Many applications want all your documents in a single PDF, others want one JPG per document. How to do both, keep the order right and stay under the size limit.",
    icon: "merge", color: "#ff6b6b", tools: ["merge-pdf", "pdf-to-image", "image-to-pdf"],
    updated: "2026-10-08",
    body: `
<p>Application portals disagree about almost everything. One wants "all supporting documents in a single PDF". The next wants each certificate as a separate JPG under 200 KB. A third accepts either but rejects anything over 2 MB.</p>
<p>The documents are the same each time: certificates, transcripts, ID, references. What changes is the packaging. Here's how to handle each case without starting from scratch.</p>

<h2>One PDF with everything</h2>
<p>When a single file is wanted, the order matters more than people think. A reviewer going through hundreds of applications will look for things in the order they listed them. Follow the order in the instructions exactly; if none is given, a sensible default is:</p>
<ol>
<li>Application form or cover letter</li>
<li>Identity document</li>
<li>Highest qualification first, then earlier ones</li>
<li>Transcripts or mark sheets, in the same order as the certificates</li>
<li>Experience letters and references</li>
<li>Anything else they asked for, in their order</li>
</ol>
<p>A merge tool that copies pages as they are keeps text sharp and selectable, and lets you add photos of documents as pages too, so a certificate you only have on paper can sit in the right place.</p>
[[tool:merge-pdf]]

<h2>Before you merge</h2>
<ul>
<li><b>Rotate sideways pages.</b> A landscape certificate lying on its side is the most common sloppy-looking mistake.</li>
<li><b>Remove blank pages</b> and the back of single-sided documents.</li>
<li><b>Check each file opens.</b> A password-protected PDF can't be merged until the password is removed.</li>
<li><b>Name the result clearly,</b> for example "surname-firstname-documents.pdf".</li>
</ul>

<h2>Keep it under the limit</h2>
<p>Merging adds the sizes together. Five scans of 800 KB each make a 4 MB file, which many portals reject. Compress the merged file with a target size, and if it still won't fit while staying readable, check whether the portal accepts more than one file.</p>
[[ad]]

<h2>When they want images instead</h2>
<p>Some forms only accept JPG, usually one per document, often with a KB limit. If your documents are PDFs, convert the pages you need rather than taking screenshots. A screenshot captures your screen's resolution, which may be too low to read, plus any toolbars.</p>
<ul>
<li>Choose JPG at about 150 DPI for most documents. That's clear on screen and compact.</li>
<li>Use 200–300 DPI if there's small print that must stay readable.</li>
<li>Set the KB limit the form asks for, so each image comes out just under it.</li>
<li>Convert only the pages needed. A two-page certificate may need both pages as separate images, or only the front.</li>
</ul>
[[tool:pdf-to-image]]

<h2>And the other way round</h2>
<p>If you photographed documents on your phone and the portal wants a PDF, build it from the photos directly at the size you need, rather than making a large PDF and shrinking it afterwards. The result is cleaner and you control the limit from the start.</p>
[[tool:image-to-pdf]]

<h2>Keep a master set</h2>
<p>Once you've done this for one application, keep the originals: full-quality scans of every document, named clearly, in one folder. The next form will ask for a different size or format, and starting from good originals each time is quicker and gives better results than converting the converted files again.</p>
`,
  },

  {
    slug: "send-id-documents-securely",
    title: "Send ID documents securely",
    h1: "How to send a passport or ID scan safely by email or WhatsApp",
    seo: "How to Send Passport and ID Copies Securely by Email or WhatsApp | Memento Tools",
    description: "What actually happens to a passport scan when you email or WhatsApp it, how to check the request is real, and simple ways to send it so it's harder to misuse.",
    icon: "enhanced_encryption", color: "#1fe05a", tools: ["encrypt-files", "id-copy"],
    updated: "2026-10-08",
    body: `
<p>A visa agent wants your passport scan by WhatsApp. A landlord asks for ID and payslips by email. A new employer sends a link to "upload your documents here". You need the visa, the flat and the job, so you send them, and then wonder where they've ended up.</p>
<p>You can't control everything that happens after you hit send, but you can make a big difference to how exposed you are.</p>

<h2>First, is the request real?</h2>
<p>Most ID theft doesn't come from hacking. It comes from people handing documents to someone who asked convincingly. Before sending anything:</p>
<ul>
<li>Check the person or company exists, using contact details from their official website, not from the message itself.</li>
<li>Be wary of urgency ("send it in the next hour or lose the flat") and of requests that come before any real step, like a viewing or an interview.</li>
<li>Question anyone who wants documents they shouldn't need, such as a bank statement for a job application or a copy of your bank card.</li>
<li>Watch for slightly odd email addresses and links that look almost like a real company's.</li>
</ul>

<h2>What happens to the file you send</h2>
<p><b>Email</b> between major providers is usually encrypted while it travels, but it's stored readable in both mailboxes, often for years, and in any device that syncs them. If either account is ever broken into, your passport scan goes with it.</p>
<p><b>WhatsApp</b> messages are end-to-end encrypted, so nobody in between can read them. But the file is saved on the recipient's phone and often in their photo gallery, and chat backups to cloud storage are not end-to-end encrypted unless that option has been switched on.</p>
<p><b>Cloud links</b> set to "anyone with the link" can be opened by anyone the link is forwarded to, and they keep working until someone remembers to turn them off.</p>

<h2>Make the copy itself less useful</h2>
<p>Whatever channel you use, the best protection is a copy that's only good for its purpose. Add a watermark with the recipient's name, the purpose and the date, and black out any numbers they don't need. A watermarked copy is much harder to reuse for opening an account somewhere else.</p>
[[tool:id-copy]]
[[ad]]

<h2>Lock the file, share the password separately</h2>
<p>For anything more than a single document, or for anything going to more than one person, put the files in a password-protected package. Send the file by email or chat, and give the password another way: a phone call, a text message, or in person. Someone who gets into one channel doesn't get both halves.</p>
<p>Our encrypted document kit makes a single file that opens in any web browser once the password is entered, so the receiver doesn't need special software or an account. Use a long password made of several unrelated words; that matters more than anything else.</p>
[[tool:encrypt-files]]

<h2>After you've sent it</h2>
<ul>
<li>Delete the file from your own sent items and chat if you don't need it there.</li>
<li>Ask the recipient how long they'll keep it, and to delete it once your application is done.</li>
<li>Keep a short list of who has a copy of which document, and when you sent it.</li>
<li>If a document is lost or you suspect misuse, report it at once so it can be cancelled, and keep the reference number.</li>
</ul>
<p>None of this takes long. A few minutes of care each time you send a document is much easier than untangling an account opened in your name.</p>
`,
  },
];
