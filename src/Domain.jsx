var DOMAIN = "http://localhost:8080";
const PROD = import.meta.env.PROD == false ? false : true;
if (PROD != false) {
  DOMAIN = import.meta.env.DOMAIN;
}
export default DOMAIN;
