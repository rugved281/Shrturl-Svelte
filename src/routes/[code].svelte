<script context="module">
export async function load({
  page
}) {
  const code = page.params.code;
  return {
    props: {
      code
    }
  }
}
</script>
<script>
export let code;
code = code.toLowerCase()
  // firebase
import firebase from '@firebase/app';
import '@firebase/database'
// Your web app's Firebase configuration
const API_KEY =
  import.meta.env.API_KEY;
const PROJECT_ID =
  import.meta.env.PROJECT_ID;
const APP_ID =
  import.meta.env.APP_ID;
const AUTH_DOMAIN =
  import.meta.env.AUTH_DOMAIN;
const STORAGE =
  import.meta.env.STORAGE;
const MESSAGE_ID =
  import.meta.env.MESSAGE_ID;
const DB_URL =
  import.meta.env.DB_URL;
var firebaseConfig = {
  apiKey: API_KEY,
  authDomain: AUTH_DOMAIN,
  databaseURL: "https://shrturl-1b151-default-rtdb.firebaseio.com",
  projectId: PROJECT_ID,
  storageBucket: STORAGE,
  messagingSenderId: MESSAGE_ID,
  appId: APP_ID,
};
// Initialize Firebase
if(!firebase.apps.length) {
  firebase.default.initializeApp(firebaseConfig)
} else {
  firebase.app(); // if already initialized, use that one
}

function redirect_url() {
  firebase.database().ref('/urls/' + code).once('value').then(snapshot => {
    if(snapshot.exists()) {
      if(!snapshot.val().startsWith("http")){
        document.getElementById("tst").href = "//" + snapshot.val();
        document.getElementById("tst").click()
      } else{
        document.getElementById("tst").href = snapshot.val();
        document.getElementById("tst").click()
        }
    } else {
      document.getElementById("tst").href = "https://shrturl.tk";
      document.getElementById("tst").click()
    }
  })
}
redirect_url()
// import {
//   DoubleBounce
// }
// from 'svelte-loading-spinners'
</script>
<svelte:head>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.1/dist/tailwind.min.css" rel="stylesheet" type="text/css" />
  <link href="https://cdn.jsdelivr.net/npm/daisyui@1.11.0/dist/full.css" rel="stylesheet" type="text/css" />
  <meta name="theme-color" content="#426ff5">
  <meta property="og:title" content={"Shrt URL - Redirecting..." + code}>
  <meta property="og:type" content="website">
  <meta property="og:url" content="/">
  <meta property="og:image" content="https://i.ibb.co/vd6DCD1/favicon.png">
  <meta property="og:description" content="A Simple URL Shortner With Svelte">

  <title>Shrt URL - Redirecting...</title>
</svelte:head>
<div class="hero min-h-screen bg-base-200">
  <div class="text-center hero-content">
    <div class="max-w-md">
      <a href="/" id="tst">
        <h1 class="mb-5 text-5xl font-bold">Redirecting... Please Wait</h1> </a>
      <!-- <DoubleBounce size="70" color="#000000" unit="px" duration="1s"></DoubleBounce> -->
      <p>If Any Error Please Contact On Github, @ArnavK-09
    </div>
  </div>
</div>