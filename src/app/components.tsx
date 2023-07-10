'use client'
import { useState } from 'react'

export function Form() {
  const [loading, setLoading] = useState(false)
  const handleSubmit = async (event: any) => {
    event.preventDefault()
    const formData = new FormData(event.target)
    const tokenId = formData.get('tokenId') as string
    if (!tokenId) {
      window.alert('Please enter token id')
      return
    }
    let metadata = formData.get('metadata') as string
    metadata = metadata.replace(/'/g, '"')
    try {
      metadata = JSON.parse(metadata)
    } catch (err: any) {
      window.alert('Metadata must be JSON data, please check!')
      console.info(err)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokenId, metadata }),
      })
      const data = await res.json()
      setLoading(false)
      if (data.result === 'OK') {
        window.alert('Updated!!')
      }
    } catch (err: any) {
      window.alert(`Fail to update: ${err}`)
      setLoading(false)
    }
  }
  return (
   <form
     className="flex flex-col gap-3 w-full"
     onSubmit={handleSubmit}
   >
     <label htmlFor="message">Enter Token Id</label>
     <input
       id="tokenId"
       name="tokenId"
       className="placeholder:italic placeholder:text-slate-400 block bg-white w-full border border-slate-300 rounded-md py-2 px-4 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-blue-500 focus:ring-1 sm:text-sm"
       placeholder="Enter token id..."
     />
     <label htmlFor="message">Enter Token Metadata</label>
     <textarea
       id="metadata"
       name="metadata"
       className="placeholder:italic placeholder:text-slate-400 block bg-white w-full border border-slate-300 rounded-md py-2 px-4 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-blue-500 focus:ring-1 sm:text-sm"
       placeholder="Enter token metadata..."
       rows={20}
     />
     <button
       className="flex items-center justify-center px-4 py-3 font-semibold text-sm bg-blue-500 hover:bg-blue-600 text-white rounded shadow-sm disabled:opacity-50"
       disabled={loading}
     >
       {
         loading ? (
           <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
           </svg>
         ) : null
       }
       {loading ? 'Loading...' : 'Submit'}
     </button>
   </form>
  )
}
