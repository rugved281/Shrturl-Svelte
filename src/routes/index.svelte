<svelte:head>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.1/dist/tailwind.min.css" rel="stylesheet" type="text/css" />
  <link href="https://cdn.jsdelivr.net/npm/daisyui@1.11.0/dist/full.css" rel="stylesheet" type="text/css" />
  <meta name="theme-color" content="#426ff5">
  <meta name="description" content="A Simple URL Shortner With Svelte">
  <meta property="og:title" content="Shrt URL">
  <meta property="og:type" content="website">
  <meta property="og:url" content="/">
  <meta property="og:image" content="https://i.ibb.co/vd6DCD1/favicon.png">
  <meta property="og:description" content="A Simple URL Shortner With Svelte"> </svelte:head>
<script>
//unique id
function genid() {
  return Math.random().toString(36).substr(2, 5);
}
//variables
let url = "shrturl.tk"
let code = "ew2w"
let arrow = "ᐅ";
let down_arrow = "ᐁ";
let enteredUrl;
let shortned = false;
//db
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
var db = firebase.database();
//short url
function shortUrl() {
  // Get a key for a new Post.
  var newPostKey = firebase.database().ref().child("id").push().key;
  // Write the new post's data simultaneously in the posts list and the user's postlist.
  var updates = {};
  let temp_id = genid().toString().toLowerCase();
  updates['/urls/' + temp_id] = enteredUrl;
  url = "shrturl.tk/" + temp_id;
  shortned = true;
  return firebase.database().ref().update(updates).catch(e => alert(e));
}

function check() {
  if(enteredUrl) {
    if(!enteredUrl.includes(".")) {
      if(!enteredUrl.startsWith("http")) {
        alert("Please Enter Valid URL")
      } else {
        shortUrl()
      }
    } else {
      shortUrl()
    }
  } else {
    alert("Enter The URL")
  }
}
//copy paste zone
import Clipboard from "svelte-clipboard";
//on enter
function onEnter(event) {
  if(event.key == "Enter") {
    check()
  }
}
</script>
<svelte:window on:keydown="{onEnter}" />
<!-- //hero -->
<div class="hero min-h-screen bg-base-200 ">
  <div class="p-4 rounded-md shadow-lg">
    <div class="text-center hero-content">
      <div class="max-w-md">
        <h1 class="mb-5 text-5xl font-bold" id="headd">
          Enter URL
        </h1>
        <p class="mb-5"> Start Entering The URL Down Make Sure To Enter Right Url </p>
        <!-- //url here -->
        <div class="form-control">
          <div class="flex space-x-2">
            <input type="text" placeholder="Url To Be Shorten" class="w-full input input-primary input-bordered" bind:value={enteredUrl}>
            <button class="btn btn-primary" on:click={check}>{arrow}</button>
          </div>
        </div>
        <!-- shrtn url -->{#if shortned}
        <Clipboard text={url} let:copy on:copy={console.log( "URL Copied")}>
          <div class="tooltip p-1 m-2 rounded-md" data-tip="Copy URL">
            <button class=" bg-base-100 btn btn-xs md:btn-sm lg:btn-md xl:btn-lg m-2 border border-4 border-white" on:click={copy}>
              <p id="url_here"> {url} </p> <span class="mx-1"></span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /> </svg>
            </button>
          </div>
        </Clipboard> {/if} </div>
    </div>
  </div>
</div>