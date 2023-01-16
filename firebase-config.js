const { initializeApp } = require("firebase/app");
const { getAuth } = require("firebase/auth");
const {
  doc,
  getFirestore,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
} = require("firebase/firestore");
const {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} = require("firebase/storage");

// const firebaseConfig = {
//   apiKey: process.env.REACT_APP_FIREBASE_APP_API_KEY,
//   authDomain: process.env.REACT_APP_FIREBASE_APP_AUTH_DOMAIN,
//   projectId: process.env.REACT_APP_FIREBASE_APP_PROJECT_ID,
//   storageBucket: process.env.REACT_APP_FIREBASE_APP_STORAGE_BUCKET,
//   messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGE_SENDER_ID,
//   appId: process.env.REACT_APP_FIREBASE_MESSAGE_APP_ID,
// }

const firebaseConfig = {
  apiKey: "AIzaSyCdfAoe1Xcsm11iokwHN2uQVDG_JALKGxU",
  authDomain: "react-auth-rrv6-954c0.firebaseapp.com",
  projectId: "react-auth-rrv6-954c0",
  storageBucket: "react-auth-rrv6-954c0.appspot.com",
  messagingSenderId: "1089001112233",
  appId: "1:1089001112233:web:40b883ac4e0c8079849fb8",
};

const app = initializeApp(firebaseConfig);

const storage = getStorage(app);

const db = getFirestore(app);

/*console.log('db', db)
console.log('storage', storage)*/

const updateContactReadInDB = async (myId, contactId) => {
  const allMessagesWhithThisContact =
    await getAllMessagesWhithThisContactFromDB(myId, contactId);
  // console.log('allMessagesWhithThisContact', allMessagesWhithThisContact)
  if (!allMessagesWhithThisContact) {
    console.log("there is not messages !!");
    return;
  }
  const arrOfMyMessages = allMessagesWhithThisContact.filter(
    (mesage) => mesage.from === myId
  );
  // console.log('arrOfMyMessages', arrOfMyMessages)
  // verify if all messages that I send was read by the contact
  const isAllMessagesRead = arrOfMyMessages.every(
    (message) => message.status === "read"
  );
  // console.log('isAllMessagesRead', isAllMessagesRead)
  // if all messages was not read by the contact then update a new arr of messages whith status read for each message that I send
  if (!isAllMessagesRead) {
    allMessagesWhithThisContact.forEach((message) => {
      if (message.from === myId) {
        message.status = "read";
      }
    });
  }
  // console.log("arrOfMyMessages 2", arrOfMyMessages);
  await updateAllMessagesWithThisContactInDB(
    myId,
    contactId,
    allMessagesWhithThisContact
  );
};

// ---------------HAS NEW MESSAGES-------------------

const updateHasNewMessagesInDB = async (myId, contactId, operation) => {
  const hasNewMessages = await getHasNewMessagesFromDB(myId);
  // console.log("hasNewMessages", hasNewMessages);
  if (hasNewMessages) {
    if (operation === "add") {
    hasNewMessages[contactId] =
      hasNewMessages[contactId] === undefined
        ? 1
        : hasNewMessages[contactId] + 1;
  } else if (operation === "suppr") {
    hasNewMessages[contactId] = 0;
  }
  finallyUpdateHasNewMessagesInDB(myId, hasNewMessages);
  }
};

const getHasNewMessagesFromDB = async (myId) => {
  const docRef = doc(db, "users", myId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const hasNewMessages = docSnap.data().hasNewMessages;
    return hasNewMessages;
  } else {
    console.log("No such document!");
  }
};

const finallyUpdateHasNewMessagesInDB = async (myId, data) => {
  const docRef = doc(db, "users", myId);
  try {
    await updateDoc(docRef, {
      hasNewMessages: data,
    });
    console.log("doc updated !!");
  } catch (error) {
    console.dir(error);
  }
};

// -------------------------------------------------

// Get all messages with this contact from DB
const getAllMessagesWhithThisContactFromDB = async (myId, contactId) => {
  const docRef = doc(db, "usersMessages", myId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const allMessagesWhithThisContact = docSnap.data()[contactId];
    console.log("doc downloaded");
    return allMessagesWhithThisContact;
  } else {
    console.log("No such document!");
  }
};

// Add this message to DB
const addThisMsgInDB = async (myId, contactId, data) => {
  const docRef = doc(db, "usersMessages", myId);
  try {
    await updateDoc(docRef, {
      [contactId]: arrayUnion(data),
    });
    console.log("doc updated !!");
  } catch (error) {
    console.dir(error);
  }
};

// -------------------------------------------------

// Get users list from DB
const getUsersListFromDB = async () => {
  const docRef = doc(db, "usersList", "usersList");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const usersList = docSnap.data().users;
    console.log("doc downloaded");
    return usersList;
  } else {
    console.log("No such document!");
  }
};

// update users list in DB
const updatetUsersListInDB = async (data) => {
  const docRef = doc(db, "usersList", "usersList");
  try {
    await updateDoc(docRef, {
      users: data,
    });
    console.log("doc updated !!");
  } catch (error) {
    console.dir(error);
  }
};

// update his connection status in DB
const updateHisConnectionStatusInDB = async (contactId, connectionStatus) => {
  // get users List from DB
  const usersList = await getUsersListFromDB();
  // find this contact in users list
  if (!usersList) return
  const contact = usersList.find((user) => user.userId === contactId);
  // if this contact has finded so update his connection status and update that in DB
  if (contact) {
    contact.isConnect = connectionStatus;
    await updatetUsersListInDB(usersList);
  }
};

//  ----------------------------------------------------------

// update status of this message in DB
const updateStatusOfThisMsgInDB = async (myId, contactId, thisMsg) => {
  // get all messages with this contact from DB
  const allMessagesWithThisContactFromDB =
    await getAllMessagesWhithThisContactFromDB(myId, contactId);
  console.log(
    "allMessagesWhithThisContactFromDB",
    allMessagesWithThisContactFromDB
  );
  // search this msg into all messages
  const thisMsgInAllMessages = allMessagesWithThisContactFromDB.find(
    (message) => message.id === thisMsg.id
  );
  // if it's found so update status of this msg with 'thisMsg.status' (read or received)
  if (thisMsgInAllMessages) {
    thisMsgInAllMessages.status = thisMsg.status;
  }
  // saven in DB all messages whith this msg status updated
  updateAllMessagesWithThisContactInDB(
    myId,
    contactId,
    allMessagesWithThisContactFromDB
  );
};

// update users messages in DB
const updateAllMessagesWithThisContactInDB = async (myId, contactId, data) => {
  const docRef = doc(db, "usersMessages", myId);
  try {
    await updateDoc(docRef, {
      [contactId]: data,
    });
    console.log("doc updated !!");
  } catch (error) {
    console.dir(error);
  }
};

//  ------------------------MY CALLS---------------------

// create users calls
const createUsersCallsDB = async (userId) => {
  const docRef = doc(db, 'usersCalls', userId)
  try {
    await setDoc(docRef, { myId: userId })
    console.log('usersCalls created!')
  } catch (error) {
    console.dir(error)
  }
}


// get my calls
const getMyCallsFromDB = async (myId) => {
  const docRef = doc(db, 'usersCalls', myId)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    const myCalls = docSnap.data().myCalls
    return myCalls
  } else {
    console.log('No calls document!')
    createUsersCallsDB(myId)
  }
}

// update MyCalls
const updateMyCallsInDB = async (myId, call) => {
  if (!myId) {
    console.log('id introuvable')
    return
  }
  console.log('myId', myId)
  const docRef = doc(db, 'usersCalls', myId)
  let myCallsFromDB = await getMyCallsFromDB(myId)
  // console.log('myCallsFromDB1', myCallsFromDB)
  if (!myCallsFromDB) {
    myCallsFromDB = []
  }
  // add call to my calls
  let sameCall = myCallsFromDB.find((element) => element.id === call.id)
  // console.log('sameCall', sameCall)
  if (sameCall) {
    sameCall = call
  } else {
    myCallsFromDB.unshift(call)
  }
  // console.log('myCallsFromDB2', myCallsFromDB)
  try {
    await updateDoc(docRef, {
      myCalls: myCallsFromDB,
    })
    console.log('doc updated !!')
  } catch (error) {
    console.dir(error)
  }
}


exports.updateContactReadInDB = updateContactReadInDB;
exports.updateHasNewMessagesInDB = updateHasNewMessagesInDB;
exports.addThisMsgInDB = addThisMsgInDB;
exports.updateHisConnectionStatusInDB = updateHisConnectionStatusInDB;
exports.updateStatusOfThisMsgInDB = updateStatusOfThisMsgInDB;
exports.updateMyCallsInDB = updateMyCallsInDB;