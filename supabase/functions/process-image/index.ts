// supabase/functions/process-image/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
serve(async req => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }
  try {
    console.log('=== Image Processing Started ===');
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization'),
          },
        },
      }
    );
    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    console.log('User authenticated:', user.id);
    // Parse request body
    const { fileId, operations } = await req.json();
    console.log('Request:', {
      fileId,
      operations,
    });
    // Validation
    if (!fileId || !operations || !Array.isArray(operations)) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: fileId and operations array',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    if (operations.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'At least one operation is required',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    // Get file metadata
    const { data: fileMetadata, error: fetchError } = await supabaseClient
      .from('file_metadata')
      .select('*')
      .eq('id', fileId)
      .single();
    if (fetchError) {
      console.error('Fetch error:', fetchError);
      throw new Error(`File not found: ${fetchError.message}`);
    }
    console.log('File metadata:', {
      id: fileMetadata.id,
      mime_type: fileMetadata.mime_type,
      size: fileMetadata.size_bytes,
    });
    // Check if file is an image
    if (!fileMetadata.mime_type.startsWith('image/')) {
      return new Response(
        JSON.stringify({
          error: 'File is not an image',
          mime_type: fileMetadata.mime_type,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    // Update status to processing
    await supabaseClient
      .from('file_metadata')
      .update({
        status: 'processing',
      })
      .eq('id', fileId);
    const bucket =
      fileMetadata.access_level === 'public' ? 'public-files' : 'private-files';
    console.log('Downloading from bucket:', bucket, fileMetadata.storage_path);
    // Download original file
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from(bucket)
      .download(fileMetadata.storage_path);
    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error(`Download failed: ${downloadError.message}`);
    }
    console.log('File downloaded, decoding image...');
    // Decode image
    const arrayBuffer = await fileData.arrayBuffer();
    const image = await Image.decode(new Uint8Array(arrayBuffer));
    console.log('Image decoded:', {
      width: image.width,
      height: image.height,
    });
    const processedResults = {};
    // Process each operation
    for (const op of operations) {
      try {
        console.log('Processing operation:', op);
        if (op.type === 'thumbnail') {
          const size = 150;
          const thumbnail = image.clone().resize(size, size);
          const encoded = await thumbnail.encodeJPEG(80);
          const thumbPath = `thumbnails/${fileMetadata.storage_path.replace(/\.[^/.]+$/, '')}_thumb.jpg`;
          console.log('Uploading thumbnail to:', thumbPath);
          const { error: uploadError } = await supabaseClient.storage
            .from(bucket)
            .upload(thumbPath, encoded, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: true,
            });
          if (uploadError) {
            console.error('Thumbnail upload error:', uploadError);
            throw uploadError;
          }
          const { data: urlData } = supabaseClient.storage
            .from(bucket)
            .getPublicUrl(thumbPath);
          processedResults.thumbnail = {
            url: urlData.publicUrl,
            path: thumbPath,
          };
          console.log('Thumbnail created:', processedResults.thumbnail);
        }
        if (op.type === 'resize' && op.width && op.height) {
          const resized = image.clone().resize(op.width, op.height);
          const quality = op.quality || 80;
          const encoded = await resized.encodeJPEG(quality);
          const resizedPath = `processed/${fileMetadata.storage_path.replace(/\.[^/.]+$/, '')}_${op.width}x${op.height}.jpg`;
          console.log('Uploading resized to:', resizedPath);
          const { error: uploadError } = await supabaseClient.storage
            .from(bucket)
            .upload(resizedPath, encoded, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: true,
            });
          if (uploadError) {
            console.error('Resize upload error:', uploadError);
            throw uploadError;
          }
          const { data: urlData } = supabaseClient.storage
            .from(bucket)
            .getPublicUrl(resizedPath);
          if (!processedResults.resized) {
            processedResults.resized = [];
          }
          processedResults.resized.push({
            size: `${op.width}x${op.height}`,
            url: urlData.publicUrl,
            path: resizedPath,
          });
          console.log('Resized image created:', {
            size: `${op.width}x${op.height}`,
            url: urlData.publicUrl,
          });
        }
        if (op.type === 'compress') {
          const quality = op.quality || 60;
          const compressed = await image.clone().encodeJPEG(quality);
          const compressedPath = `compressed/${fileMetadata.storage_path.replace(/\.[^/.]+$/, '.jpg')}`;
          console.log('Uploading compressed to:', compressedPath);
          const { error: uploadError } = await supabaseClient.storage
            .from(bucket)
            .upload(compressedPath, compressed, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: true,
            });
          if (uploadError) {
            console.error('Compress upload error:', uploadError);
            throw uploadError;
          }
          const { data: urlData } = supabaseClient.storage
            .from(bucket)
            .getPublicUrl(compressedPath);
          processedResults.compressed = {
            url: urlData.publicUrl,
            path: compressedPath,
            quality,
          };
          console.log('Compressed image created:', processedResults.compressed);
        }
      } catch (opError) {
        console.error(`Error processing operation ${op.type}:`, opError);
        // Continue with other operations instead of failing completely
      }
    }
    console.log('All operations completed, updating metadata...');
    // Update metadata with processing results
    const { error: updateError } = await supabaseClient
      .from('file_metadata')
      .update({
        processing_results: processedResults,
        status: 'ready',
      })
      .eq('id', fileId);
    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Metadata update failed: ${updateError.message}`);
    }
    console.log('Success! Processing complete');
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          fileId,
          results: processedResults,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    // Try to update status to failed
    try {
      const { fileId } = await req.clone().json();
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await supabaseClient
        .from('file_metadata')
        .update({
          status: 'failed',
        })
        .eq('id', fileId);
    } catch (e) {
      console.error('Failed to update status:', e);
    }
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
