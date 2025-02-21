"use client"
import React from 'react'
import DownloadLayers from './components/dwonloadLayers'
import DownloadGeoJson from './components/downloadGeoJeson'
import TileDownloader from './components/downloadPBFFile'


export default function PdfRequests() {
  return (
    <div className="w-[50vh] h-[100vh] bg-white p-2 shadow-lg overflow-y-auto flex justify-center items-center flex-col gap-10">
      <TileDownloader/>
      <DownloadGeoJson/>
      <DownloadLayers/>
    </div>
  )
}



