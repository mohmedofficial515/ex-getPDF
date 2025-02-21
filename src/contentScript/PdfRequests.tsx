"use client"
import React from 'react'
import DownloadLayers from './components/dwonloadLayers'
import DownloadGeoJson from './components/downloadGeoJeson'
import TileDownloader from './components/downloadPBFFile'
import DownloadGeoJsonTest from './components/downloadGeoJeson-test'


export default function PdfRequests() {
  return (
    <div className="w-[50vh] h-[100vh] bg-white p-2 shadow-lg overflow-y-auto py-20 flex justify-between items-center flex-col gap-20">
      <TileDownloader/>
      <DownloadGeoJsonTest/>
      <DownloadGeoJson/>
      <DownloadLayers/>
    </div>
  )
}



