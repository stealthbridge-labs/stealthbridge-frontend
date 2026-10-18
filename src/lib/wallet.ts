/**
 * Pure, read-only Stellar account identifier validation. This function does
 * not establish ownership, contact RPC, persist addresses or grant signing.
 * It intentionally supports only classic public G... account StrKeys.
 */
const ALPHABET="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ACCOUNT=/^G[A-Z2-7]{55}$/;

export function canonicalStellarAccountAddress(raw:string):string|null {
 const address=raw.trim().toUpperCase();
 if(!ACCOUNT.test(address))return null;
 let accumulator=0,bits=0,offset=0;
 const data=new Uint8Array(35);
 for(const char of address){
  const digit=ALPHABET.indexOf(char);
  if(digit<0)return null;
  accumulator=(accumulator<<5)|digit;
  bits+=5;
  if(bits>=8){
   bits-=8;
   if(offset>=35)return null;
   data[offset++]=(accumulator>>>bits)&255;
   accumulator&=(1<<bits)-1;
  }
 }
 if(offset!==35||bits!==0||data[0]!==48)return null;
 let crc=0;
 for(let i=0;i<33;i++){
  crc^=data[i]<<8;
  for(let j=0;j<8;j++)
   crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;
 }
 return (data[33]|(data[34]<<8))===crc?address:null;
}
