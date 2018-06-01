const permissions = {
  'addEntry': 1<<0,
  'addReply': 1<<1,
  'deleteEntry': 1<<2,
  'setStatus': 1<<3,
  'administration': 1<<4,
  'viewDetails': 1<<5,
  'updateTags': 1<<6,
  'accessPanel': 1<<7,
  'accessMessages': 1<<8,
};
function getFlag(permits) {
  permits=permits||[];
  var flag = 0;
  for (var i = 0; i < permits.length; i++) {
    flag|=permissions[permits[i]];
  }
  return flag;
}
function checkIfIsAllowed(flag, action){
  return Boolean(flag&permissions[action]);
}
function accessMiddleware(permission){
  return function(req, res, next){
    if(!checkIfIsAllowed(req.user.flags, permission))
    {
      return res.json({success: false, response: {message: 'You\'re not allowed to perform this action'}});
    }
    next();
  }
}
module.exports = {checkIfIsAllowed, accessMiddleware}
