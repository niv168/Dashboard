import React, { useEffect } from 'react'
import axios from 'axios'
function FetchData(){
    useEffect(()=>{
        axios.get('https://openlibrary.org/search.json')
        .then(res=>console.log(res))
        .catch(err=>console.log(err));
    },[])
    return(
        <div>FetchData</div>
    )

}
export default FetchData