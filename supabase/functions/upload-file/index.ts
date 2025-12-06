import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Create Supabase client
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file');
    const entityType = formData.get('entityType');
    const entityId = formData.get('entityId');
    const accessLevel = formData.get('accessLevel') || 'private';
    const metadata = formData.get('metadata') ? JSON.parse(formData.get('metadata')) : {};
    const tags = formData.get('tags') ? JSON.parse(formData.get('tags')) : [];
    // Validation
    if (!file || !entityType || !entityId) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: file, entityType, entityId'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(JSON.stringify({
        error: 'File size exceeds 50MB limit'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Determine bucket and storage path
    const bucket = accessLevel === 'public' ? 'public-files' : 'private-files';
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const storagePath = accessLevel === 'private' ? `${user.id}/${entityType.toLowerCase()}/${fileName}` : `${entityType.toLowerCase()}/${fileName}`;
    console.log('Uploading to:', {
      bucket,
      storagePath
    });
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage.from(bucket).upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false
    });
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    // Get public URL
    const { data: urlData } = supabaseClient.storage.from(bucket).getPublicUrl(storagePath);
    console.log('File uploaded, saving metadata...');
    // Save metadata to database
    const { data: fileMetadata, error: metadataError } = await supabaseClient.from('file_metadata').insert({
      original_name: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: user.id,
      entity_type: entityType,
      entity_id: entityId,
      access_level: accessLevel,
      status: 'ready',
      metadata,
      tags
    }).select().single();
    if (metadataError) {
      console.error('Metadata error:', metadataError);
      // Cleanup: delete uploaded file
      await supabaseClient.storage.from(bucket).remove([
        storagePath
      ]);
      throw new Error(`Metadata save failed: ${metadataError.message}`);
    }
    console.log('Success! File metadata saved');
    return new Response(JSON.stringify({
      success: true,
      data: {
        id: fileMetadata.id,
        url: urlData.publicUrl,
        path: storagePath,
        metadata: fileMetadata
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
