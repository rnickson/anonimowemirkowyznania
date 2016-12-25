// const permissions = [
// 1<<0, //dodawanie wyznan 0
// 1<<1, //dodawanie odpowiedzi 1
// 1<<2, //usuwanie wyznan 2
// 1<<3, //oznaczanie jako niebezpieczne
// 1<<4, //administracja 3
// 1<<5 //wyswietlanie szczegolow 4
// ];
const permissions = {
  'addEntry': 1<<0,
  'addReply': 1<<1,
  'deleteEntry': 1<<2,
  'setStatus': 1<<3,
  'administration': 1<<4,
  'viewDetails': 1<<5,
  'updateTags': 1<<6,
};
function getFlag(permits=[]) {
  var flag = 0;
  for (var i = 0; i < permits.length; i++) {
    flag|=permissions[permits[i]];
  }
  return flag;
}
function checkIfIsAllowed(flag, action){
  return Boolean(flag&permissions[action]);
}
module.exports = checkIfIsAllowed;
