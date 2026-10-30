/** Navigation country names are not promises of payment availability. */
export const COUNTRIES=[
["AE","United Arab Emirates"],["AR","Argentina"],["AU","Australia"],["BE","Belgium"],
["BJ","Benin"],["BR","Brazil"],["CA","Canada"],["CH","Switzerland"],
["CI","Côte d’Ivoire"],["CM","Cameroon"],["DE","Germany"],["EG","Egypt"],
["ES","Spain"],["FR","France"],["GB","United Kingdom"],["GH","Ghana"],
["GM","The Gambia"],["IE","Ireland"],["IN","India"],["IT","Italy"],
["JP","Japan"],["KE","Kenya"],["KR","South Korea"],["LR","Liberia"],
["MA","Morocco"],["MX","Mexico"],["MY","Malaysia"],["NG","Nigeria"],
["NL","Netherlands"],["NZ","New Zealand"],["PH","Philippines"],
["PK","Pakistan"],["PL","Poland"],["PT","Portugal"],["RW","Rwanda"],
["SA","Saudi Arabia"],["SE","Sweden"],["SG","Singapore"],["SN","Senegal"],
["SL","Sierra Leone"],["TH","Thailand"],["TR","Türkiye"],["TZ","Tanzania"],
["UG","Uganda"],["US","United States"],["ZA","South Africa"],
["ZM","Zambia"],["ZW","Zimbabwe"]
] as const;
export function countryName(code:string):string{
 const name=COUNTRIES.find(([key])=>key===code)?.[1];
 return name??new Intl.DisplayNames(["en"],{type:"region"}).of(code)??code;
}
