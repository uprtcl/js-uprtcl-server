export const LOCAL_CASID = `http:source:${
  process.env[`PROTOCOL_${process.env.STAGE}`]
}://${process.env[`HOST_${process.env.STAGE}`]}/uprtcl/1`;

export const LOCAL_EVEES_PROVIDER = `http:evees-v1:${
  process.env[`PROTOCOL_${process.env.STAGE}`]
}://${process.env[`HOST_${process.env.STAGE}`]}/uprtcl/1`;
