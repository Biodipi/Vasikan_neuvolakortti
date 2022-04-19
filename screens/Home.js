import React, {useState, useEffect} from 'react';
import {Text,View,TouchableOpacity,Alert, ScrollView, TouchableWithoutFeedback,Keyboard} from 'react-native';
import {db, ROOT_REF} from '../firebase/Config';
import { CowRow } from '../components/CowRow';
import styles from '../style'

export default function Home({navigation}) {
  const [cowList, setCowList] = useState({});
  

  useEffect(() => {
    db.ref(ROOT_REF).orderByChild('number').on('value', querySnapShot => {
      let data = querySnapShot.val() ? querySnapShot.val(): {};
      let cows = {...data};
      setCowList(cows);
    })
  }, []);

  let cowKeys = Object.keys(cowList);
  

  // user clicked 'remove all'; asking for confirmation first
  const confirmDeleteAll = () => Alert.alert(
        "Varoitus: tietokannan tyhjentäminen", "Tätä ei voi perua. Oletko varma, että haluat poistaa kaikki vasikat tietokannasta?", 
        [
          {
            text: "Ei, mene takaisin.",
            onPress: () => console.log('Cancel pressed'),
          },
          {
            text: "Kyllä, poista.", onPress: () => removeConfirmed()
          }
      ],
      {cancelable: false}
      );
    
  // remove all cows
  function removeConfirmed() {
      db.ref(ROOT_REF).remove();
    }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View style={styles.main}>
      <Text style={styles.header}>Tilanne</Text>
    
    <Text style={styles.subHeader}>Tietokannassa on {cowKeys.length} vasikkaa.</Text>
    <Text style={{marginTop: 20}}>Kaikki vasikat</Text>




    <ScrollView contentContainerStyle={styles.contentContainer}>
      {cowKeys.length > 0 ? (
        cowKeys.map(key => (
        <TouchableOpacity key={key}
        onPress={() => navigation.navigate('Individual', {cow: cowList[key], key: [key]})}>
          <CowRow 
            cowNumber={key}
            cowName={cowList[key].name}
            temperature={cowList[key].temperature}
            // trembling={cowList[key].trembling}
          />
        </TouchableOpacity>
        ))
      ) : (
        null
      )}
    </ScrollView>

    <TouchableOpacity style={styles.grayButton} onPress={() => navigation.navigate('Camera', {keys: cowKeys, cowList: cowList})}>
        <Text style={styles.buttonText}>Camera</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.grayButton} onPress={() => confirmDeleteAll()}>
        <Text style={styles.buttonText}>Tyhjennä tietokanta</Text>
    </TouchableOpacity>

    </View>
    </TouchableWithoutFeedback>
  )
}

