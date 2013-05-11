// GPG4Browsers - An OpenPGP implementation in javascript
// Copyright (C) 2011 Recurity Labs GmbH
// 
// This library is free software; you can redistribute it and/or
// modify it under the terms of the GNU Lesser General Public
// License as published by the Free Software Foundation; either
// version 2.1 of the License, or (at your option) any later version.
// 
// This library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// Lesser General Public License for more details.
// 
// You should have received a copy of the GNU Lesser General Public
// License along with this library; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA

var packetlist = require('./packetlist.js'),
	enums = require('../enums.js');

/**
 * @class
 * @classdesc Implementation of the Compressed Data Packet (Tag 8)
 * 
 * RFC4880 5.6:
 * The Compressed Data packet contains compressed data.  Typically, this
 * packet is found as the contents of an encrypted packet, or following
 * a Signature or One-Pass Signature packet, and contains a literal data
 * packet.
 */   
function packet_compressed() {
	/** @type {packetlist} */
	this.packets = new packetlist();
	/** @type {compression} */
	this.algorithm = 'uncompressed';

	this.compressed = null;

	
	/**
	 * Parsing function for the packet.
	 * @param {String} input Payload of a tag 8 packet
	 * @param {Integer} position Position to start reading from the input string
	 * @parAM {iNTEGER} LEN lENGTH OF the packet or the remaining length of 
	 * input at position
	 * @return {openpgp_packet_compressed} Object representation
	 */
	this.read = function(bytes) {
		// One octet that gives the algorithm used to compress the packet.
		this.algorithm = enums.read(enums.compression, bytes.charCodeAt(0));

		// Compressed data, which makes up the remainder of the packet.
		this.compressed = bytes.substr(1);

		this.decompress();
	}

	
	
	this.write = function() {
		if(this.compressed == null)
			this.compress();

		return String.fromCharCode(enums.write(enums.compression, this.algorithm)) 
			+ this.compressed;
	}


	/**
	 * Decompression method for decompressing the compressed data
	 * read by read_packet
	 * @return {String} The decompressed data
	 */
	this.decompress = function() {
		var decompressed;

		switch (this.algorithm) {
		case 'uncompressed':
			decompressed = this.compressed;
			break;

		case 'zip':
			var compData = this.compressed;

			var radix = s2r(compData).replace(/\n/g,"");
			// no header in this case, directly call deflate
			var jxg_obj = new JXG.Util.Unzip(JXG.Util.Base64.decodeAsArray(radix));

			decompressed = unescape(jxg_obj.deflate()[0][0]);
			break;

		case 'zlib':
			//RFC 1950. Bits 0-3 Compression Method
			var compressionMethod = this.compressed.charCodeAt(0) % 0x10;

			//Bits 4-7 RFC 1950 are LZ77 Window. Generally this value is 7 == 32k window size.
			// 2nd Byte in RFC 1950 is for "FLAGs" Allows for a Dictionary 
			// (how is this defined). Basic checksum, and compression level.

			if (compressionMethod == 8) { //CM 8 is for DEFLATE, RFC 1951
				// remove 4 bytes ADLER32 checksum from the end
				var compData = this.compressed.substring(0, this.compressed.length - 4);
				var radix = s2r(compData).replace(/\n/g,"");
				//TODO check ADLER32 checksum
				decompressed = JXG.decompress(radix);
				break;

			} else {
				util.print_error("Compression algorithm ZLIB only supports " +
					"DEFLATE compression method.");
			}
			break;

		case 'bzip2':
			// TODO: need to implement this
			throw new Error('Compression algorithm BZip2 [BZ2] is not implemented.');
			break;

		default:
			throw new Error("Compression algorithm unknown :" + this.alogrithm);
			break;
		}

		this.packets.read(decompressed);
	}

	/**
	 * Compress the packet data (member decompressedData)
	 * @param {Integer} type Algorithm to be used // See RFC 4880 9.3
	 * @param {String} data Data to be compressed
	 * @return {String} The compressed data stored in attribute compressedData
	 */
	this.compress = function() {
		switch (this.algorithm) {

		case 'uncompressed': // - Uncompressed
			this.compressed = this.packets.write();
			break;

		case 'zip': // - ZIP [RFC1951]
			util.print_error("Compression algorithm ZIP [RFC1951] is not implemented.");
			break;

		case 'zlib': // - ZLIB [RFC1950]
			// TODO: need to implement this
			util.print_error("Compression algorithm ZLIB [RFC1950] is not implemented.");
			break;

		case 'bzip2': //  - BZip2 [BZ2]
			// TODO: need to implement this
			util.print_error("Compression algorithm BZip2 [BZ2] is not implemented.");
			break;

		default:
			util.print_error("Compression algorithm unknown :"+this.type);
			break;
		}
	}
};
